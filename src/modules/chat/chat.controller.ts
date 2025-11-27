import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ============================================
  // USER ENDPOINTS
  // ============================================

  @Get('messages')
  async getMessages(
    @Query('conversationId') conversationId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('userId') userId?: string
  ) {
    if (userId) {
      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        throw new BadRequestException('userId must be a valid number');
      }

      // Lấy conversations của user
      const conversations = await this.chatService.getUserConversations(userIdNum);
      return { conversations };
    }

    if (conversationId) {
      const conversationIdNum = parseInt(conversationId, 10);
      if (isNaN(conversationIdNum)) {
        throw new BadRequestException('conversationId must be a valid number');
      }

      const messages = await this.chatService.getConversationMessages(conversationIdNum);
      return { messages };
    }

    if (sessionId) {
      const messages = await this.chatService.getSessionMessages(sessionId);
      return { messages };
    }

    throw new BadRequestException('Missing required parameters: userId, conversationId, or sessionId');
  }

  @Get('guest-messages')
  async getGuestMessages(@Query('sessionId') sessionId: string) {
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    // Sử dụng getSessionMessages thay vì getGuestMessagesBeforeLogin
    const messages = await this.chatService.getSessionMessages(sessionId);
    return { messages };
  }

  @Post('migrate')
  async migrateMessages(@Body() body: { sessionId: string; userId: number }) {
    const { sessionId, userId } = body;

    if (!sessionId || !userId) {
      throw new BadRequestException('Missing required fields: sessionId and userId');
    }

    return this.chatService.migrateToUser(sessionId, userId);
  }

  @Get('conversation-ids')
  async getConversationIds(@Query('userId', ParseIntPipe) userId: number) {
    if (!userId) throw new BadRequestException('userId is required');
    
    const conversationIds = await this.chatService.getConversationIdsByUserId(userId);
    return { conversationIds };
  }

  // ============================================
  // THÊM CÁC ENDPOINTS MỚI CHO TÍNH NĂNG HIỆN TẠI
  // ============================================

  @Get('conversations/:userId')
  async getUserConversations(@Param('userId', ParseIntPipe) userId: number) {
    if (!userId) throw new BadRequestException('userId is required');
    
    const conversations = await this.chatService.getUserConversations(userId);
    return { conversations };
  }

  @Get('conversation/:conversationId')
  async getConversation(@Param('conversationId', ParseIntPipe) conversationId: number) {
    if (!conversationId) throw new BadRequestException('conversationId is required');
    
    const conversation = await this.chatService.getConversationById(conversationId);
    return { conversation };
  }

  @Post('bot-message')
  async saveBotMessage(
    @Body() body: { conversationId: number; message: string; userId?: number; metadata?: any }
  ) {
    const { conversationId, message, userId, metadata } = body;

    if (!conversationId || !message) {
      throw new BadRequestException('conversationId and message are required');
    }

    const botMessage = await this.chatService.saveBotMessageForUser(
      conversationId,
      message,
      userId,
      metadata
    );

    return { message: botMessage };
  }
}