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
import { ChatService } from './chat.service';
import { Logger } from '@nestjs/common';
import { AiService } from './ai/ai.service';
import { PrismaService } from 'prisma/prisma.service';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);
  private processingMessages = new Set<string>();

  constructor(
    private readonly chatService: ChatService,
    private readonly aiService: AiService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const userId = this.getUserId(client);
      const sessionId = client.handshake.auth.sessionId || this.generateSessionId();

      client.data = { userId, sessionId, conversationId: null };
      
      this.logger.log(`✅ Client connected: ${client.id}`, { userId, sessionId });
      client.emit('session-initialized', { sessionId });
      client.join(`session:${sessionId}`);

      if (userId) {
        await this.handleUserConnection(client, userId, sessionId);
      }
    } catch (error) {
      this.logger.error('❌ Connection error:', error);
      client.emit('error', { message: 'Lỗi kết nối' });
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Client disconnected: ${client.id}`);
  }

@SubscribeMessage('send:message')
async handleSendMessage(
  @MessageBody() data: { message: string; metadata?: any; conversationId?: number },
  @ConnectedSocket() client: Socket,
) {
  const { userId, sessionId } = client.data;
  const message = data.message?.trim();

  // Validate
  if (!this.validateMessage(message, client)) return;

  // 🔥 Check duplicate
  const messageKey = this.createMessageKey(
    client.id, 
    userId, 
    sessionId, 
    message,
    data.conversationId
  );
  
  if (this.processingMessages.has(messageKey)) {
    this.logger.warn('🚫 DUPLICATE BLOCKED:', {
      clientId: client.id,
      userId,
      message: message.substring(0, 30)
    });
    return;
  }

  this.processingMessages.add(messageKey);

  try {
    this.logger.log('💾 Processing message:', {
      clientId: client.id,
      userId,
      message: message.substring(0, 50),
      conversationId: data.conversationId
    });

    // Lưu message user - CHỈ 1 LẦN
    const userMessage = await this.chatService.saveMessage({
      userId,
      sessionId,
      message,
      senderType: 'USER',
      conversationId: data.conversationId,
      metadata: data.metadata
    }) as any;

    this.logger.log('✅ User message saved:', {
      messageId: userMessage.id,
      conversationId: userMessage.conversationId
    });

    // Update conversationId
    if (userMessage.conversationId && !client.data.conversationId) {
      client.data.conversationId = userMessage.conversationId;
      client.join(`conversation:${userMessage.conversationId}`);
      client.emit('conversation:created', {
        conversationId: userMessage.conversationId
      });
    }

    // Emit user message
    client.emit('message', userMessage);

    // ✅ GỌI AI ĐỂ TẠO PHẢN HỒI - CHỈ GỌI 1 LẦN
    await this.generateAIResponse(client, userMessage);

  } catch (error) {
    this.logger.error('❌ Send message error:', error);
    client.emit('error', { 
      message: 'Lỗi khi gửi tin nhắn',
      details: error.message 
    });
  } finally {
    setTimeout(() => {
      this.processingMessages.delete(messageKey);
    }, 5000);
  }
}

  @SubscribeMessage('user-login')
  async handleUserLogin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: number }
  ) {
    try {
      const { userId } = payload;
      if (!this.validateUserId(userId, client)) return;

      this.logger.log('👤 User login:', { userId, sessionId: client.data.sessionId });

      client.data.userId = userId;
      const result = await this.chatService.migrateToUser(client.data.sessionId, userId);

      if (result.conversationId) {
        client.data.conversationId = result.conversationId;
        client.join(`conversation:${result.conversationId}`);
        client.emit('conversation-updated', result);
        
        this.logger.log('✅ User migrated:', {
          userId,
          conversationId: result.conversationId
        });
      }
    } catch (error) {
      this.logger.error('❌ Login error:', error);
      client.emit('error', { message: 'Lỗi khi đăng nhập' });
    }
  }

  @SubscribeMessage('bot:message')
  async handleBotMessage(
    @MessageBody() data: { message: string; conversationId?: number; metadata?: any },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { userId, sessionId } = client.data;
      const message = data.message?.trim();

      if (!this.validateMessage(message, client)) return;

      this.logger.log('🤖 Saving bot message:', {
        conversationId: data.conversationId,
        messageLength: message.length
      });

      const botMessage = await this.chatService.saveMessage({
        userId,
        sessionId,
        message,
        senderType: 'BOT',
        conversationId: data.conversationId,
        metadata: { ...data.metadata, ai: true }
      });

      this.logger.log('✅ Bot message saved:', {
        messageId: (botMessage as any).id
      });

      client.emit('message', botMessage);
      
    } catch (error) {
      this.logger.error('❌ Bot message error:', error);
      client.emit('error', { message: 'Lỗi khi gửi tin nhắn bot' });
    }
  }

  @SubscribeMessage('join:conversation')
  async handleJoinConversation(
    @MessageBody() conversationId: number,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!conversationId) return;

      client.data.conversationId = conversationId;
      client.join(`conversation:${conversationId}`);
      
      this.logger.log('👥 Joined conversation:', {
        clientId: client.id,
        conversationId
      });
    } catch (error) {
      this.logger.error('❌ Join error:', error);
    }
  }

  @SubscribeMessage('ai:generate')
  async handleAIGenerate(
    @MessageBody() data: { message: string; conversationId?: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { userId, sessionId, conversationId } = client.data;
      const message = data.message?.trim();

      if (!this.validateMessage(message, client)) return;

      this.logger.log('🧠 Direct AI generation:', {
        userId,
        conversationId,
        message: message.substring(0, 50)
      });

      const conversationHistory = await this.getConversationHistory(
        data.conversationId || conversationId,
        userId,
        sessionId
      );

      const aiReply = await this.aiService.generateReply([
        ...conversationHistory,
        { senderType: 'USER', message }
      ]);

      if (aiReply) {
        const botMessage = await this.chatService.saveBotMessageForUser(
          data.conversationId || conversationId,
          aiReply,
          userId,
          { ai: true, direct: true }
        );

        client.emit('message', botMessage);
      }

    } catch (error) {
      this.logger.error('❌ Direct AI generation error:', error);
      client.emit('error', { message: 'Lỗi khi tạo phản hồi AI' });
    }
  }

private async generateAIResponse(client: Socket, userMessage: any) {
  try {
    const { userId, sessionId } = client.data;
    
    // 🔥 THÊM: Kiểm tra xem đã có AI response cho message này chưa
    const existingAIReply = await this.prisma.chatMessage.findFirst({
      where: {
        conversationId: userMessage.conversationId,
        senderType: 'BOT',
        metadata: {
          path: ['responseTo'],
          equals: userMessage.id
        }
      }
    });

    if (existingAIReply) {
      this.logger.warn('🚫 AI response already exists for this message, skipping:', {
        userMessageId: userMessage.id,
        existingAIReplyId: existingAIReply.id
      });
      return;
    }

    this.logger.log('🤖 Generating AI response...', {
      conversationId: userMessage.conversationId,
      userMessageId: userMessage.id
    });

    const conversationHistory = await this.getConversationHistory(
      userMessage.conversationId,
      userId,
      sessionId
    );

    const aiReply = await this.aiService.generateReply(conversationHistory, {
      model: 'gpt-4o-mini',
      systemPrompt: 'Bạn là chuyên gia chứng khoán Việt Nam. Hãy trả lời ngắn gọn, chính xác và chuyên nghiệp về thị trường chứng khoán, cổ phiếu, phân tích kỹ thuật, và đầu tư. Ưu tiên thông tin về VN-Index, HNX, Upcom, và các cổ phiếu blue-chip.',
      temperature: 0.7,
      maxTokens: 800,
    });

    if (!aiReply) {
      this.logger.warn('❌ AI returned empty response');
      return;
    }

    this.logger.log('✅ AI response generated:', {
      length: aiReply.length,
      preview: aiReply.substring(0, 100)
    });

    // 🔥 THÊM: Kiểm tra lại một lần nữa trước khi lưu (race condition protection)
    const finalCheck = await this.prisma.chatMessage.findFirst({
      where: {
        conversationId: userMessage.conversationId,
        senderType: 'BOT', 
        metadata: {
          path: ['responseTo'],
          equals: userMessage.id
        }
      }
    });

    if (finalCheck) {
      this.logger.warn('🚫 Duplicate AI response detected in final check, skipping');
      return;
    }

    const botMessage = await this.chatService.saveBotMessageForUser(
      userMessage.conversationId,
      aiReply,
      userId,
      { ai: true, responseTo: userMessage.id }
    );

    client.emit('message', botMessage);
    this.logger.log('✅ AI message sent to client');

  } catch (error) {
    this.logger.error('❌ AI response error:', error);
    
    const errorMessage = await this.chatService.saveBotMessageForUser(
      userMessage.conversationId,
      'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.',
      client.data.userId,
      { error: true, originalError: error.message }
    );
    
    client.emit('message', errorMessage);
  }
}

  private async getConversationHistory(
    conversationId: number | null,
    userId: number | null,
    sessionId: string
  ): Promise<{ senderType: string; message: string }[]> {
    try {
      let messages: any[] = [];

      if (conversationId) {
        messages = await this.chatService.getConversationMessages(conversationId);
      } else if (userId) {
        const conversations = await this.chatService.getUserConversations(userId);
        if (conversations.length > 0) {
          const latestConversation = conversations[0];
          messages = latestConversation.messages || [];
        }
      } else {
        messages = await this.chatService.getSessionMessages(sessionId);
      }

      return messages
        .slice(-10)
        .map(msg => ({
          senderType: msg.senderType,
          message: msg.message
        }));

    } catch (error) {
      this.logger.error('❌ Error getting conversation history:', error);
      return [];
    }
  }

  private async handleUserConnection(client: Socket, userId: number, sessionId: string) {
    try {
      const result = await this.chatService.migrateToUser(sessionId, userId);
      if (result.conversationId) {
        client.data.conversationId = result.conversationId;
        client.join(`conversation:${result.conversationId}`);
        client.emit('conversation-updated', { conversationId: result.conversationId });
        
        this.logger.log('✅ Auto-migrated:', {
          userId,
          conversationId: result.conversationId
        });
      }
    } catch (error) {
      this.logger.error('❌ Auto-migration error:', error);
    }
  }

  private createMessageKey(
    clientId: string,
    userId: number | null, 
    sessionId: string, 
    message: string,
    conversationId?: number
  ): string {
    const parts = [
      clientId,
      userId || 'guest',
      sessionId,
      conversationId || 'new',
      message.substring(0, 100)
    ];
    return parts.join('|||');
  }

  private validateMessage(message: string, client: Socket): boolean {
    if (!message) {
      client.emit('error', { message: 'Tin nhắn không được để trống' });
      return false;
    }
    if (message.length > 5000) {
      client.emit('error', { message: 'Tin nhắn quá dài (tối đa 5000 ký tự)' });
      return false;
    }
    return true;
  }

  private validateUserId(userId: number, client: Socket): boolean {
    if (!userId || userId <= 0) {
      client.emit('error', { message: 'User ID không hợp lệ' });
      return false;
    }
    return true;
  }

  private getUserId(client: Socket): number | null {
    const userId = client.handshake.auth.userId;
    return userId ? parseInt(userId) : null;
  }

  private generateSessionId(): string {
    return `${Math.random().toString(36).substring(2)}-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }
}