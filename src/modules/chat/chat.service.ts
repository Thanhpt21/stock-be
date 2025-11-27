import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ChatRedisService } from './redis/chat-redis.service';

interface SaveMessageParams {
  userId?: number | null;
  sessionId: string;
  message: string;
  senderType: 'USER' | 'BOT';
  conversationId?: number;
  metadata?: any;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private messageCache = new Map<string, { timestamp: number; messageId: any }>();

  constructor(
    private prisma: PrismaService,
    private chatRedisService: ChatRedisService,
  ) {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.messageCache.entries()) {
        if (now - value.timestamp > 3000) {
          this.messageCache.delete(key);
        }
      }
    }, 5000);
  }

  async saveMessage(params: SaveMessageParams) {
    const { userId, sessionId, message, senderType, conversationId, metadata } = params;

    const cacheKey = this.createMessageCacheKey(userId, sessionId, message, senderType);
    const cached = this.messageCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < 3000) {
      this.logger.warn('🚫 Duplicate message detected in cache, returning cached:', {
        cacheKey: cacheKey.substring(0, 50),
        messageId: cached.messageId
      });
      return cached.messageId;
    }

    const cleanMetadata = { ...metadata };
    delete cleanMetadata.tempId;

    let savedMessage;

    if (userId) {
      savedMessage = await this.saveToDatabase({
        userId,
        sessionId,
        message,
        senderType,
        conversationId,
        metadata: cleanMetadata
      });
    } else {
      savedMessage = await this.saveToRedis({
        sessionId,
        message,
        senderType,
        metadata: cleanMetadata
      });
    }

    this.messageCache.set(cacheKey, {
      timestamp: Date.now(),
      messageId: savedMessage
    });

    return savedMessage;
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

    // 🔥 THÊM: Kiểm tra duplicate dựa trên responseTo
    if (metadata?.responseTo) {
      const existingReply = await this.prisma.chatMessage.findFirst({
        where: {
          conversationId,
          senderType: 'BOT',
          metadata: {
            path: ['responseTo'],
            equals: metadata.responseTo
          }
        }
      });

      if (existingReply) {
        this.logger.warn('🚫 Bot reply already exists for this user message:', {
          responseTo: metadata.responseTo,
          existingId: existingReply.id
        });
        return existingReply;
      }
    }

    const cleanMetadata = { ...metadata };
    delete cleanMetadata.tempId;

    const botMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: userId ?? null,
        senderType: 'BOT',
        message: trimmed,
        metadata: { ...cleanMetadata, ai: true },
      },
    });

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    this.logger.log('✅ Bot message saved:', {
      messageId: botMessage.id,
      conversationId
    });

    return botMessage;
  } catch (error) {
    this.logger.error('❌ Error saving bot message:', error);
    throw error;
  }
}

  async migrateToUser(sessionId: string, userId: number) {
    try {
      this.logger.log('🔄 Starting migration:', { sessionId, userId });

      const sessionMessages = await this.chatRedisService.getSessionMessages(sessionId);

      if (!sessionMessages.length) {
        this.logger.log('📭 No messages to migrate');
        return { message: 'No messages to migrate' };
      }

      let conversation = await this.prisma.chatConversation.findFirst({
        where: { userId, sessionId },
      });

      if (!conversation) {
        conversation = await this.prisma.chatConversation.create({
          data: { userId, sessionId, status: 'ACTIVE' },
        });
        this.logger.log('✅ Conversation created:', { conversationId: conversation.id });
      }

      if (sessionMessages.length > 0) {
        await this.migrateMessagesToDb(sessionMessages, conversation.id, sessionId);
        await this.chatRedisService.clearSessionMessages(sessionId);
        this.logger.log('✅ Messages migrated:', { count: sessionMessages.length });
      }

      return { conversationId: conversation.id };
    } catch (error) {
      this.logger.error('❌ Migration error:', error);
      throw error;
    }
  }

  async getConversationMessages(conversationId: number) {
    try {
      const messages = await this.prisma.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        include: {
          conversation: {
            include: {
              user: { select: { id: true, name: true, avatar: true } },
            },
          },
        },
      });

      this.logger.log('📨 Fetched conversation messages:', {
        conversationId,
        count: messages.length
      });

      return messages;
    } catch (error) {
      this.logger.error(`❌ Error getting conversation messages:`, error);
      throw error;
    }
  }

  async getSessionMessages(sessionId: string) {
    try {
      return await this.chatRedisService.getSessionMessages(sessionId);
    } catch (error) {
      this.logger.error(`❌ Error getting session messages:`, error);
      throw error;
    }
  }

  async getUserConversations(userId: number) {
    try {
      return await this.prisma.chatConversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          user: { select: { id: true, name: true, avatar: true } },
        },
      });
    } catch (error) {
      this.logger.error(`❌ Error getting user conversations:`, error);
      throw error;
    }
  }

  async getConversationById(conversationId: number) {
    try {
      return await this.prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          user: { select: { id: true, name: true, avatar: true } },
        },
      });
    } catch (error) {
      this.logger.error(`❌ Error getting conversation:`, error);
      throw error;
    }
  }

  async getConversationIdsByUserId(userId: number): Promise<number[]> {
    try {
      const conversations = await this.prisma.chatConversation.findMany({
        where: { userId, status: 'ACTIVE' },
        select: { id: true },
        orderBy: { updatedAt: 'desc' },
      });

      return conversations.map(c => c.id);
    } catch (error) {
      this.logger.error(`❌ Error getting conversationIds:`, error);
      throw error;
    }
  }

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
      this.logger.error(`❌ Error getting guest messages:`, error);
      throw error;
    }
  }

  private createMessageCacheKey(
    userId: number | null | undefined,
    sessionId: string | null,
    message: string,
    senderType: string
  ): string {
    const userPart = userId || sessionId || 'anonymous';
    const messagePart = message.substring(0, 100);
    return `${userPart}-${senderType}-${messagePart}`;
  }

  private async saveToDatabase(params: SaveMessageParams & { userId: number }) {
    const { userId, sessionId, message, senderType, conversationId, metadata } = params;

    this.logger.log('💾 Saving to database:', {
      userId,
      senderType,
      conversationId,
      messageLength: message.length
    });

    const conversation = conversationId 
      ? await this.prisma.chatConversation.findUnique({ where: { id: conversationId } })
      : await this.getOrCreateConversation(userId, sessionId);

    if (!conversation) {
      throw new Error('Cannot create or find conversation');
    }

    const recentDuplicate = await this.prisma.chatMessage.findFirst({
      where: {
        conversationId: conversation.id,
        senderType,
        senderId: senderType === 'USER' ? userId : null,
        message: message.trim(),
        createdAt: {
          gte: new Date(Date.now() - 10000)
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (recentDuplicate) {
      this.logger.warn('🚫 DUPLICATE FOUND IN DATABASE:', {
        existingId: recentDuplicate.id,
        conversationId: conversation.id,
        message: message.substring(0, 30)
      });
      
      return { ...recentDuplicate, conversationId: conversation.id };
    }

    const dbMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: senderType === 'USER' ? userId : null,
        senderType,
        message: message.trim(),
        metadata,
        sessionId,
      },
    });

    await this.prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    this.logger.log('✅ NEW MESSAGE SAVED:', {
      messageId: dbMessage.id,
      conversationId: conversation.id
    });

    return { ...dbMessage, conversationId: conversation.id };
  }

  private async saveToRedis(params: Omit<SaveMessageParams, 'userId' | 'conversationId'>) {
    const { sessionId, message, senderType, metadata } = params;

    this.logger.log('💾 Saving to Redis:', {
      sessionId,
      senderType,
      messageLength: message.length
    });

    const redisMessage = {
      id: this.generateMessageId(),
      sessionId,
      senderId: null,
      senderType,
      message: message.trim(),
      metadata,
      createdAt: new Date().toISOString(),
    };

    await this.chatRedisService.saveSessionMessage(sessionId, redisMessage);
    
    this.logger.log('✅ Message saved to Redis:', {
      messageId: redisMessage.id
    });

    return redisMessage;
  }

  private async getOrCreateConversation(userId: number, sessionId?: string) {
    let conversation = await this.prisma.chatConversation.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await this.prisma.chatConversation.create({
        data: { userId, sessionId, status: 'ACTIVE' },
      });
      this.logger.log('✅ New conversation created:', {
        conversationId: conversation.id,
        userId
      });
    }

    return conversation;
  }

  private generateMessageId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private async migrateMessagesToDb(messages: any[], conversationId: number, sessionId: string) {
    const existingMessages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
        message: {
          in: messages.map(m => m.message)
        }
      },
      select: { message: true }
    });

    const existingMessageTexts = new Set(existingMessages.map(m => m.message));

    const messagesData = messages
      .filter(msg => !existingMessageTexts.has(msg.message))
      .map(msg => ({
        conversationId,
        senderId: msg.senderId || null,
        senderType: msg.senderType,
        sessionId,
        message: msg.message,
        metadata: msg.metadata || null,
        createdAt: new Date(msg.createdAt),
      }));

    if (messagesData.length > 0) {
      await this.prisma.chatMessage.createMany({ data: messagesData });
      this.logger.log('✅ Messages migrated to DB:', {
        count: messagesData.length,
        conversationId
      });
    } else {
      this.logger.log('⚠️ All messages already exist, skipping migration');
    }
  }
}