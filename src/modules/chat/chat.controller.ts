import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Body,
  Param,
  BadRequestException,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { GetMessagesDto, MigrateMessagesDto } from './dto/send-message.dto';
import { AiService } from './ai/ai.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly aiService: AiService
  ) {}

  // ============================================
  // USER ENDPOINTS
  // ============================================

  @Get('messages')
  async getMessages(@Query() query: GetMessagesDto) {
    const { conversationId, sessionId, userId } = query;

    if (userId) {
      const userIdNum = parseInt(userId as any, 10);
      if (isNaN(userIdNum)) {
        throw new BadRequestException('userId must be a valid number');
      }

      const conversations = await this.chatService.getUserConversations(userIdNum);
      return { conversations };
    }

    if (conversationId) {
      const messages = await this.chatService.getConversationMessages(conversationId);
      return { messages };
    }

    if (sessionId) {
      const messages = await this.chatService.getSessionMessages(sessionId);
      return { messages };
    }

    throw new BadRequestException('Missing required parameters');
  }

  @Get('guest-messages')
  async getGuestMessages(@Query('sessionId') sessionId: string) {
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    const conversations = await this.chatService.getGuestMessagesBeforeLogin(sessionId);
    return { conversations };
  }

  @Post('migrate')
  async migrateMessages(@Body() body: MigrateMessagesDto) {
    const { sessionId, userId } = body;

    if (!sessionId || !userId) {
      throw new BadRequestException('Missing required fields');
    }

    return this.chatService.migrateMessagesToDb(sessionId, userId);
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  @Get('admin/conversations')
  async getAllConversations(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const skip = (pageNum - 1) * limitNum;

    const conversations = await this.chatService.getAllConversations({
      status,
      skip,
      take: limitNum,
    });

    return conversations;
  }

  @Get('admin/conversations/:id')
  async getConversationById(@Param('id', ParseIntPipe) conversationId: number) {
    const conversation = await this.chatService.getConversationById(conversationId);
    if (!conversation) {
      throw new BadRequestException('Conversation not found');
    }
    return { conversation };
  }

  @Get('admin/conversations/:id/messages')
  async getConversationMessages(@Param('id', ParseIntPipe) conversationId: number) {
    const messages = await this.chatService.getConversationMessages(conversationId);
    return { messages };
  }

  @Patch('admin/conversations/:id/mark-read')
  async markMessagesAsRead(
    @Param('id', ParseIntPipe) conversationId: number,
    @Body('adminId', ParseIntPipe) adminId: number
  ) {
    if (!adminId) throw new BadRequestException('adminId is required');
    await this.chatService.markMessagesAsRead(conversationId, adminId);
    return { success: true, message: 'Messages marked as read' };
  }

  @Get('admin/unread-count')
  async getUnreadCount() {
    const count = await this.chatService.getUnreadMessagesCount();
    return { count };
  }

  @Patch('admin/conversations/:id/close')
  async closeConversation(@Param('id', ParseIntPipe) conversationId: number) {
    const conversation = await this.chatService.closeConversation(conversationId);
    return { success: true, conversation };
  }

  @Patch('admin/conversations/:id/reopen')
  async reopenConversation(@Param('id', ParseIntPipe) conversationId: number) {
    const conversation = await this.chatService.reopenConversation(conversationId);
    return { success: true, conversation };
  }

  @Patch('admin/conversations/:id/assign')
  async assignConversation(
    @Param('id', ParseIntPipe) conversationId: number,
    @Body('adminId', ParseIntPipe) adminId: number
  ) {
    if (!adminId) throw new BadRequestException('adminId is required');
    const conversation = await this.chatService.assignConversation(conversationId, adminId);
    return { success: true, conversation };
  }

  @Get('admin/my-conversations')
  async getAdminConversations(@Query('adminId', ParseIntPipe) adminId: number) {
    if (!adminId) throw new BadRequestException('adminId is required');
    const conversations = await this.chatService.getAdminConversations(adminId);
    return { conversations };
  }

  @Get('admin/search')
  async searchConversations(@Query('keyword') keyword: string) {
    if (!keyword || keyword.trim().length === 0) {
      throw new BadRequestException('keyword is required');
    }
    const conversations = await this.chatService.searchConversations(keyword);
    return { conversations };
  }

  @Get('admin/stats')
  async getStatistics() {
    const stats = await this.chatService.getConversationStats();
    return { stats };
  }

  @Get('conversation-ids')
  async getConversationIds(@Query('userId', ParseIntPipe) userId: number) {
    if (!userId) throw new BadRequestException('userId is required');
    const conversationIds = await this.chatService.getConversationIdsByUserId(userId);
    return { conversationIds };
  }

  // ============================================
  // AI GLOBAL ENDPOINTS
  // ============================================

  @Get('ai-enabled')
  async isAiChatEnabled() {
    const enabled = await this.aiService.isAiChatEnabled();
    return { aiChatEnabled: enabled };
  }

  @Put('ai-enabled')
  @UseGuards(JwtAuthGuard)
  async setAiChatEnabled(@Body('aiChatEnabled') aiChatEnabled: boolean) {
    if (aiChatEnabled === undefined || aiChatEnabled === null) {
      throw new BadRequestException('aiChatEnabled field is required');
    }

    const result = await this.aiService.setAiChatEnabled(aiChatEnabled);
    return { aiChatEnabled: result };
  }
}
