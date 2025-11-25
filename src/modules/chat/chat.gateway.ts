import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatRedisService } from './redis/chat-redis.service';
import { v4 as uuidv4 } from 'uuid';
import { ChatService } from './chat.service';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { AiService } from './ai/ai.service';
import { PrismaService } from 'prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly chatRedisService: ChatRedisService,
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const userId = client.handshake.auth.userId
        ? parseInt(client.handshake.auth.userId)
        : null;
      const sessionId = client.handshake.auth.sessionId || uuidv4();
      const isAdmin = client.handshake.auth.isAdmin === true || client.handshake.auth.isAdmin === 'true';

      client.data.userId = userId;
      client.data.sessionId = sessionId;
      client.data.conversationId = null;
      client.data.isAdmin = isAdmin;

      this.logger.log(`Client connected: ${client.id}`, {
        userId,
        sessionId,
        isAdmin,
      });

      if (isAdmin) {
        client.join('admin-room');
        this.logger.log(`Admin ${userId} joined admin-room`);
      }

      client.emit('session-initialized', { sessionId });
      client.join(`session:${sessionId}`);

      if (userId && !isAdmin) {
        const result = await this.chatService.migrateMessagesToDb(sessionId, userId);
        if ('conversationId' in result && result.conversationId) {
          client.data.conversationId = result.conversationId;
          client.join(`conversation:${result.conversationId}`);
          client.emit('conversation-updated', { conversationId: result.conversationId });
        }

        await this.chatRedisService.setUserOnline(userId);
      }
    } catch (error) {
      this.logger.error('Error in handleConnection:', error);
      client.emit('error', { message: 'Lỗi kết nối' });
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    if (client.data.isAdmin) {
      client.leave('admin-room');
    }

    if (client.data.userId) {
      await this.chatRedisService.setUserOffline(client.data.userId);
    }
  }

  @SubscribeMessage('user-login')
  async handleUserLogin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: number }
  ) {
    try {
      const { userId } = payload;

      if (!userId || userId <= 0) {
        client.emit('error', { message: 'Invalid userId' });
        return;
      }

      client.data.userId = userId;

      if (!client.data.sessionId) {
        client.data.sessionId = uuidv4();
        this.logger.log(`Created new session for user ${userId}: ${client.data.sessionId}`);
      }

      client.data.senderType = 'USER';

      const result = await this.chatService.migrateMessagesToDb(
        client.data.sessionId,
        userId
      );

      if (result.conversationId) {
        client.data.conversationId = result.conversationId;
        client.join(`conversation:${result.conversationId}`);

        const conversation = await this.chatService.getConversationById(result.conversationId);
        client.emit('conversation-updated', conversation);
      }

      await this.chatRedisService.setUserOnline(userId);
      this.logger.log(`Guest session ${client.data.sessionId} migrated to user ${userId}`);
    } catch (error) {
      this.logger.error('Error in handleUserLogin:', error);
      client.emit('error', { message: 'Lỗi khi đăng nhập chat' });
    }
  }

  @SubscribeMessage('admin-login')
  async handleAdminLogin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { adminId: number }
  ) {
    try {
      const { adminId } = payload;

      if (!adminId || adminId <= 0) {
        client.emit('error', { message: 'Invalid adminId' });
        return;
      }

      client.data.userId = adminId;
      client.data.isAdmin = true;
      client.join('admin-room');

      this.logger.log(`Admin ${adminId} logged in and joined admin-room`);
      client.emit('admin-login-success', { adminId });
    } catch (error) {
      this.logger.error('Error in handleAdminLogin:', error);
      client.emit('error', { message: 'Lỗi khi đăng nhập admin' });
    }
  }

  @SubscribeMessage('join:conversation')
  async handleJoinConversation(
    @MessageBody() conversationId: number,
    @ConnectedSocket() client: Socket,
  ) {
    if (!conversationId || conversationId <= 0) {
      client.emit('error', { message: 'Invalid conversationId' });
      return;
    }
    client.join(`conversation:${conversationId}`);
    client.data.conversationId = conversationId;
    this.logger.log(`Client ${client.id} (userId: ${client.data.userId}, isAdmin: ${client.data.isAdmin}) joined conversation ${conversationId}`);
  }

  @SubscribeMessage('leave:conversation')
  async handleLeaveConversation(
    @MessageBody() conversationId: number,
    @ConnectedSocket() client: Socket,
  ) {
    if (!conversationId || conversationId <= 0) {
      return;
    }

    client.leave(`conversation:${conversationId}`);
    if (client.data.conversationId === conversationId) {
      client.data.conversationId = null;
    }
    this.logger.log(`Client ${client.id} left conversation ${conversationId}`);
  }

  @SubscribeMessage('send:message')
  async handleSendMessage(
    @MessageBody() data: { message: string; conversationId?: number; metadata?: any; tempId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!data.message || typeof data.message !== 'string') {
        client.emit('error', { message: 'Message is required' });
        return;
      }

      const trimmedMessage = data.message.trim();
      if (trimmedMessage.length === 0) {
        client.emit('error', { message: 'Message cannot be empty' });
        return;
      }

      if (trimmedMessage.length > 5000) {
        client.emit('error', { message: 'Message too long (max 5000 characters)' });
        return;
      }

      const { userId, sessionId, conversationId: clientConversationId } = client.data;
      let conversationId = data.conversationId || clientConversationId;

      let conversation: any;
      if (userId) {
        this.logger.log(`USER logged in - userId: ${userId}, message: "${trimmedMessage}"`);

        if (!conversationId) {
          conversation = await this.chatService.getOrCreateConversation({ userId, sessionId });
          conversationId = conversation.id;
        }

        const message = await this.chatService.saveUserMessage(
          userId,
          conversationId,
          trimmedMessage,
          sessionId,
          data.metadata,
        );

        if (data.tempId) (message as any).tempId = data.tempId;

        if (!client.data.conversationId && message.conversationId) {
          client.data.conversationId = message.conversationId;
          client.join(`conversation:${message.conversationId}`);
          client.emit('conversation-updated', { conversationId: message.conversationId });
        }

        this.server.to(`conversation:${message.conversationId}`).emit('message', message);
        this.server.to('admin-room').emit('new-user-message', {
          conversationId: message.conversationId,
          userId,
          message,
        });
      } else {
        this.logger.log(`GUEST - sessionId: ${sessionId}, message: "${trimmedMessage}"`);

        const guestMessage = await this.chatService.saveGuestMessage(sessionId, trimmedMessage, data.metadata);
        if (data.tempId) (guestMessage as any).tempId = data.tempId;

        if (!client.rooms.has(`session:${sessionId}`)) client.join(`session:${sessionId}`);

        this.server.to(`session:${sessionId}`).emit('message', guestMessage);
        this.server.to('admin-room').emit('new-guest-message', {
          sessionId,
          message: guestMessage,
        });
      }

      // AI Auto Reply (Global – không cần tenant)
      try {
        const delayMs = 800; // Default delay
        await new Promise(r => setTimeout(r, delayMs));

        let conversationHistory: { senderType: string; message: string }[] = [];

        if (userId && conversationId) {
          conversationHistory = await this.prisma.chatMessage.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            select: { senderType: true, message: true },
          });
        }

        const aiReply = await this.aiService.generateReply(conversationHistory);

        if (aiReply?.trim().length) {
          const botMessage = userId
            ? await this.chatService.saveBotMessageForUser(conversationId!, aiReply, userId)
            : await this.chatService.saveBotMessage(sessionId, aiReply);

          const room = userId ? `conversation:${conversationId}` : `session:${sessionId}`;
          this.server.to(room).emit('message', botMessage);
          this.logger.log(`AI replied and emitted to ${room}: ${aiReply}`);
        }
      } catch (aiErr) {
        this.logger.error('AI auto reply error:', aiErr);
      }

    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('error', { message: 'Lỗi khi gửi tin nhắn' });
    }
  }

  @SubscribeMessage('admin:send-message')
  async handleAdminSendMessage(
    @MessageBody() data: {
      conversationId?: number;
      sessionId?: string;
      message: string;
      metadata?: any;
      tempId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!client.data.isAdmin) {
        client.emit('error', { message: 'Unauthorized: Admin only' });
        return;
      }

      if (!data.conversationId && !data.sessionId) {
        client.emit('error', { message: 'conversationId or sessionId is required' });
        return;
      }

      if (!data.message || data.message.trim().length === 0) {
        client.emit('error', { message: 'Message cannot be empty' });
        return;
      }

      const { userId: adminId } = client.data;
      const trimmedMessage = data.message.trim();

      if (data.conversationId) {
        this.logger.log(`ADMIN ${adminId} sending message to conversation ${data.conversationId}`);

        const message = await this.chatService.saveAdminMessage(
          adminId,
          data.conversationId,
          trimmedMessage,
          data.metadata,
        );

        if (data.tempId) {
          (message as any).tempId = data.tempId;
        }

        this.server.to(`conversation:${data.conversationId}`).emit('message', message);
        this.logger.log(`Admin message sent to conversation ${data.conversationId}`);
        return;
      }

      if (data.sessionId) {
        this.logger.log(`ADMIN ${adminId} sending message to guest session ${data.sessionId}`);

        const adminMessage = await this.chatService.saveAdminMessageToGuest(
          adminId,
          data.sessionId,
          trimmedMessage,
          data.metadata,
        );

        client.emit('message', adminMessage);
        this.server.to(`session:${data.sessionId}`).emit('message', adminMessage);

        this.logger.log(`Admin message sent to guest session ${data.sessionId}`);
      }
    } catch (error) {
      this.logger.error('Error in admin send message:', error);
      client.emit('error', { message: 'Lỗi khi gửi tin nhắn admin' });
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @MessageBody() data: { conversationId?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId, conversationId: clientConversationId, isAdmin } = client.data;
    const conversationId = data.conversationId || clientConversationId;

    if (userId && conversationId) {
      await this.chatRedisService.setTyping(conversationId, userId, true);
      client.to(`conversation:${conversationId}`).emit('typing', {
        userId,
        isTyping: true,
        isAdmin,
      });
    }
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @MessageBody() data: { conversationId?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId, conversationId: clientConversationId, isAdmin } = client.data;
    const conversationId = data.conversationId || clientConversationId;

    if (userId && conversationId) {
      await this.chatRedisService.setTyping(conversationId, userId, false);
      client.to(`conversation:${conversationId}`).emit('typing', {
        userId,
        isTyping: false,
        isAdmin,
      });
    }
  }
}