import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ChatRedisService, ChatMessageRedis } from './redis/chat-redis.service';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from 'prisma/prisma.service';
import { ChatConversation } from '@prisma/client';
import { AiService } from './ai/ai.service';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private chatRedisService: ChatRedisService,
    private aiService: AiService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {}

  /**
   * Migrate messages từ guest session (Redis) sang user conversation (DB)
   */
  async migrateMessagesToDb(sessionId: string, userId: number) {
    try {
      const sessionMessages = await this.chatRedisService.getSessionMessages(sessionId);

      if (!sessionMessages.length) {
        this.logger.log(`No messages to migrate for session ${sessionId}`);
        return { message: 'No messages to migrate' };
      }

      const existingConversation = await this.prisma.chatConversation.findFirst({
        where: { userId, sessionId },
      });

      if (existingConversation) {
        this.logger.log(`Session ${sessionId} already migrated to conversation ${existingConversation.id}`);
        return { conversationId: existingConversation.id };
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const conversation = await tx.chatConversation.create({
          data: {
            userId,
            sessionId,
            status: 'ACTIVE',
          },
        });

        const messagesData = sessionMessages.map(msg => ({
          conversationId: conversation.id,
          senderId: msg.senderId || null,
          senderType: msg.senderType,
          sessionId,
          message: msg.message,
          metadata: msg.metadata || null,
          createdAt: new Date(msg.createdAt),
        }));

        await tx.chatMessage.createMany({ data: messagesData });

        this.logger.log(`Migrated ${messagesData.length} messages from session ${sessionId} to conversation ${conversation.id}`);

        return { conversationId: conversation.id };
      });

      await this.chatRedisService.clearSessionMessages(sessionId);

      return result;
    } catch (error) {
      this.logger.error(`Error migrating messages for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Lấy hoặc tạo conversation cho user
   */
  async getOrCreateConversation(params: { 
    userId: number; 
    sessionId?: string | null;
  }): Promise<ChatConversation> {
    const { userId, sessionId } = params;

    try {
      let conversation = await this.prisma.chatConversation.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        include: { messages: true },
      });

      if (!conversation) {
        conversation = await this.prisma.chatConversation.create({
          data: {
            userId,
            sessionId,
            status: 'ACTIVE',
          },
          include: { messages: true },
        });

        this.logger.log(`Created new conversation ${conversation.id} for user ${userId}`);
      } else if (sessionId && !conversation.sessionId) {
        conversation = await this.prisma.chatConversation.update({
          where: { id: conversation.id },
          data: { sessionId },
          include: { messages: true },
        });
      }

      return conversation;
    } catch (error) {
      this.logger.error(`Error in getOrCreateConversation for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Lưu tin nhắn của guest (chưa login) vào Redis
   */
  async saveGuestMessage(
    sessionId: string,
    message: string,
    metadata?: any,
  ): Promise<ChatMessageRedis> {
    try {
      if (!sessionId) {
        sessionId = uuidv4();
      }

      if (!message || message.trim().length === 0) {
        throw new Error('Message cannot be empty');
      }

      const guestMessage: ChatMessageRedis = {
        id: uuidv4(),
        sessionId,
        senderId: undefined,
        senderType: 'GUEST',
        message: message.trim(),
        metadata,
        createdAt: new Date().toISOString(),
      };

      await this.chatRedisService.saveSessionMessage(sessionId, guestMessage);
      this.logger.log(`Saved guest message for session ${sessionId}`);

      return guestMessage;
    } catch (error) {
      this.logger.error(`Error saving guest message:`, error);
      throw error;
    }
  }

  /**
   * Lưu tin nhắn bot vào Redis (cho guest)
   */
  async saveBotMessage(
    sessionId: string,
    message: string,
  ): Promise<ChatMessageRedis> {
    try {
      const botMessage: ChatMessageRedis = {
        id: uuidv4(),
        sessionId,
        senderId: undefined,
        senderType: 'BOT',
        message: message.trim(),
        metadata: null,
        createdAt: new Date().toISOString(),
      };

      await this.chatRedisService.saveSessionMessage(sessionId, botMessage);
      this.logger.log(`Saved bot message for session ${sessionId}`);

      return botMessage;
    } catch (error) {
      this.logger.error(`Error saving bot message:`, error);
      throw error;
    }
  }

  async saveBotMessageForUser(
    conversationId: number,
    message: string,
    userId?: number,
    metadata?: any,
  ) {
    try {
      const trimmed = message?.trim();
      if (!trimmed) throw new Error('Bot message cannot be empty');

      const botMessage = await this.prisma.chatMessage.create({
        data: {
          conversationId,
          senderId: userId ?? null,
          senderType: 'BOT',
          message: trimmed,
          metadata: { ...metadata, ai: true },
        },
      });

      this.logger.log(`Bot message ${botMessage.id} saved in conversation ${conversationId}`);

      try {
        this.chatGateway.server
          .to(`conversation:${conversationId}`)
          .emit('receive:message', botMessage);

        this.logger.log(`Bot message emitted to conversation:${conversationId}`);
      } catch (emitErr) {
        this.logger.warn('Failed to emit bot message:', emitErr);
      }

      return botMessage;
    } catch (error) {
      this.logger.error('Error saving bot message:', error);
      throw error;
    }
  }

  /**
   * Lưu tin nhắn của user (đã login) vào DB
   */
  async saveUserMessage(
    userId: number,
    conversationId: number | undefined,
    message: string,
    sessionId: string,
    metadata?: any,
  ) {
    try {
      const trimmed = message?.trim();
      if (!trimmed) throw new Error('Message cannot be empty');
      if (trimmed.length > 5000) throw new Error('Message too long (max 5000 chars)');

      let conversation = conversationId
        ? await this.prisma.chatConversation.findUnique({ where: { id: conversationId } })
        : null;

      if (!conversation && userId) {
        conversation = await this.getOrCreateConversation({
          userId,
          sessionId,
        });
      }

      if (!conversation) throw new Error('Cannot create or find conversation');

      const dbMessage = await this.prisma.$transaction(async (tx) => {
        const msg = await tx.chatMessage.create({
          data: {
            conversationId: conversation.id,
            senderId: userId,
            senderType: 'USER',
            message: trimmed,
            metadata,
            sessionId,
          },
        });

        await tx.chatConversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });

        this.logger.log(`User message ${msg.id} saved in conversation ${conversation.id}`);
        return msg;
      });

      return dbMessage;
    } catch (error) {
      this.logger.error('Error saving user message:', error);
      throw error;
    }
  }

  /**
   * Lấy lịch sử chat từ DB
   */
  async getConversationMessages(conversationId: number) {
    try {
      const id = parseInt(conversationId.toString(), 10);
      if (isNaN(id)) {
        throw new Error(`Invalid conversationId: ${conversationId}`);
      }
      return await this.prisma.chatMessage.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'asc' },
        include: {
          conversation: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true },
              },
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error getting conversation messages for ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Lấy messages từ Redis (guest)
   */
  async getSessionMessages(sessionId: string) {
    try {
      return await this.chatRedisService.getSessionMessages(sessionId);
    } catch (error) {
      this.logger.error(`Error getting session messages for ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Lấy conversation theo id
   */
  async getConversationById(conversationId: number): Promise<ChatConversation | null> {
    try {
      return await this.prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          user: { select: { id: true, name: true, avatar: true } },
        },
      });
    } catch (error) {
      this.logger.error(`Error getting conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Lấy danh sách conversations của user
   */
  async getUserConversations(userId: number) {
    try {
      return await this.prisma.chatConversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          user: { select: { id: true, name: true, avatar: true } },
        },
      });
    } catch (error) {
      this.logger.error(`Error getting user conversations for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Lấy các tin nhắn của guest trước khi login
   */
  async getGuestMessagesBeforeLogin(sessionId: string) {
    try {
      let conversations = await this.prisma.chatConversation.findMany({
        where: { sessionId, status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          user: { select: { id: true, name: true, avatar: true } },
        },
      });

      if (conversations.length === 0) {
        const redisMessages = await this.getSessionMessages(sessionId);
        
        if (redisMessages.length > 0) {
          const tempConversation = {
            id: -1,
            userId: null,
            sessionId,
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: redisMessages.map(msg => ({
              id: Math.floor(Math.random() * 1000000),
              conversationId: -1,
              senderId: msg.senderId || null,
              senderType: msg.senderType,
              message: msg.message,
              metadata: msg.metadata || null,
              isRead: false,
              createdAt: new Date(msg.createdAt),
            })),
            user: null,
          };
          conversations = [tempConversation as any];
        }
      }

      return conversations;
    } catch (error) {
      this.logger.error(`Error getting guest messages for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Lấy tất cả các conversations (dành cho admin)
   */
  async getAllConversations(params?: {
    status?: string;
    skip?: number;
    take?: number;
  }): Promise<any> {
    try {
      const { status, skip = 0, take = 20 } = params || {};
      const where: any = {};
      if (status) where.status = status;

      const [conversations, total] = await Promise.all([
        this.prisma.chatConversation.findMany({
          where,
          skip,
          take,
          orderBy: { updatedAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, avatar: true } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                senderId: true,
                senderType: true,
                message: true,
                createdAt: true,
                isRead: true,
              },
            },
            _count: {
              select: {
                messages: {
                  where: { isRead: false, senderType: 'USER' },
                },
              },
            },
          },
        }),
        this.prisma.chatConversation.count({ where }),
      ]);

      return {
        conversations,
        pagination: {
          total,
          page: Math.floor(skip / take) + 1,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      };
    } catch (error) {
      this.logger.error('Error getting all conversations:', error);
      throw error;
    }
  }

  async closeConversation(conversationId: number) {
    try {
      return await this.prisma.chatConversation.update({
        where: { id: conversationId },
        data: { status: 'CLOSED', updatedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Error closing conversation ${conversationId}:`, error);
      throw error;
    }
  }

  async reopenConversation(conversationId: number) {
    try {
      return await this.prisma.chatConversation.update({
        where: { id: conversationId },
        data: { status: 'ACTIVE', updatedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Error reopening conversation ${conversationId}:`, error);
      throw error;
    }
  }

async assignConversation(conversationId: number, adminId: number) {
  try {
    return await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { 
        // Sử dụng userId thay vì assignedAdminId
        userId: adminId, 
        updatedAt: new Date() 
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  } catch (error) {
    this.logger.error(`Error assigning conversation ${conversationId}:`, error);
    throw error;
  }
}

async getAdminConversations(adminId: number) {
  try {
    return await this.prisma.chatConversation.findMany({
      where: { 
        // Sử dụng userId thay vì assignedAdminId
        userId: adminId 
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: {
          select: {
            messages: {
              where: { isRead: false, senderType: 'USER' },
            },
          },
        },
      },
    });
  } catch (error) {
    this.logger.error(`Error getting admin conversations for admin ${adminId}:`, error);
    throw error;
  }
}
  async searchConversations(keyword: string) {
    try {
      const where: any = {
        OR: [
          { user: { name: { contains: keyword, mode: 'insensitive' } } },
          { messages: { some: { message: { contains: keyword, mode: 'insensitive' } } } },
        ],
      };

      return await this.prisma.chatConversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 50,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
    } catch (error) {
      this.logger.error('Error searching conversations:', error);
      throw error;
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats() {
    try {
      const [
        totalConversations,
        activeConversations,
        closedConversations,
        totalMessages,
        unreadMessages,
        todayConversations,
      ] = await Promise.all([
        this.prisma.chatConversation.count(),
        this.prisma.chatConversation.count({ where: { status: 'ACTIVE' } }),
        this.prisma.chatConversation.count({ where: { status: 'CLOSED' } }),
        this.prisma.chatMessage.count(),
        this.prisma.chatMessage.count({
          where: { isRead: false, senderType: 'USER' },
        }),
        this.prisma.chatConversation.count({
          where: {
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
      ]);

      return {
        totalConversations,
        activeConversations,
        closedConversations,
        totalMessages,
        unreadMessages,
        todayConversations,
      };
    } catch (error) {
      this.logger.error('Error getting conversation stats:', error);
      throw error;
    }
  }

  async saveAdminMessageToGuest(
    adminId: number,
    sessionId: string,
    message: string,
    metadata?: any,
  ): Promise<ChatMessageRedis> {
    try {
      if (!message || message.trim().length === 0) {
        throw new Error('Message cannot be empty');
      }

      if (message.length > 5000) {
        throw new Error('Message too long (max 5000 characters)');
      }

      const adminMessage: ChatMessageRedis = {
        id: uuidv4(),
        sessionId,
        senderId: adminId,
        senderType: 'ADMIN',
        message: message.trim(),
        metadata,
        createdAt: new Date().toISOString(),
      };

      await this.chatRedisService.saveSessionMessage(sessionId, adminMessage);
      this.logger.log(`Admin ${adminId} sent message to guest session ${sessionId}`);

      return adminMessage;
    } catch (error) {
      this.logger.error(`Error saving admin message to guest:`, error);
      throw error;
    }
  }

  async saveAdminMessage(
    adminId: number,
    conversationId: number,
    message: string,
    metadata?: any,
  ) {
    try {
      if (!message || message.trim().length === 0) {
        throw new Error('Message cannot be empty');
      }

      if (message.length > 5000) {
        throw new Error('Message too long (max 5000 characters)');
      }

      const conversation = await this.prisma.chatConversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      return await this.prisma.$transaction(async (tx) => {
        const dbMessage = await tx.chatMessage.create({
          data: {
            conversationId,
            senderId: adminId,
            senderType: 'ADMIN',
            message: message.trim(),
            metadata,
          },
        });

        await tx.chatConversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        this.logger.log(`Admin ${adminId} sent message ${dbMessage.id} in conversation ${conversationId}`);

        return dbMessage;
      });
    } catch (error) {
      this.logger.error(`Error saving admin message:`, error);
      throw error;
    }
  }

  async markMessagesAsRead(conversationId: number, readerId: number) {
    try {
      await this.prisma.chatMessage.updateMany({
        where: {
          conversationId,
          isRead: false,
          senderId: { not: readerId },
        },
        data: { isRead: true },
      });

      this.logger.log(`Marked messages as read for conversation ${conversationId} by user ${readerId}`);
    } catch (error) {
      this.logger.error(`Error marking messages as read:`, error);
      throw error;
    }
  }

  async getUnreadMessagesCount() {
    try {
      const count = await this.prisma.chatMessage.count({
        where: { isRead: false, senderType: 'USER' },
      });
      return count;
    } catch (error) {
      this.logger.error('Error getting unread messages count:', error);
      throw error;
    }
  }

  async cleanupOldGuestSessions(olderThanHours: number = 24) {
    try {
      const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
      this.logger.log(`Cleaned up guest sessions older than ${olderThanHours} hours`);
    } catch (error) {
      this.logger.error('Error cleaning up old sessions:', error);
    }
  }

  async getConversationIdsByUserId(userId: number): Promise<number[]> {
    try {
      const conversations = await this.prisma.chatConversation.findMany({
        where: { userId, status: 'ACTIVE', sessionId: { not: null } },
        select: { id: true },
        orderBy: { updatedAt: 'desc' },
      });

      return conversations.map(c => c.id);
    } catch (error) {
      this.logger.error(`Error getting conversationIds for user ${userId}:`, error);
      throw error;
    }
  }
}