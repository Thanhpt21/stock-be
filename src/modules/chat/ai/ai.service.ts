import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from 'prisma/prisma.service';

interface AiOptions {
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;
  private defaultModel = 'gpt-4o-mini';
  private defaultPrompt = 'Bạn là chuyên gia chứng khoán Việt Nam. Trả lời ngắn gọn, chính xác và chuyên nghiệp về thị trường chứng khoán, cổ phiếu, phân tích kỹ thuật.';

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 2,
    });
  }

  async generateReply(
    conversationHistory: { senderType: string; message: string }[],
    options?: AiOptions,
  ): Promise<string | null> {
    const systemPrompt = options?.systemPrompt || this.defaultPrompt;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((m) => ({
        role: m.senderType === 'USER' ? 'user' : 'assistant',
        content: m.message,
      })),
    ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

    try {
      this.logger.log('🤖 Calling OpenAI API...', {
        messageCount: messages.length,
        model: options?.model || this.defaultModel
      });

      const completion = await this.openai.chat.completions.create({
        model: options?.model || this.defaultModel,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 800,
        messages,
      });

      const content = completion.choices[0]?.message?.content?.trim();
      
      if (!content) {
        this.logger.warn('AI returned empty content');
        return 'Xin lỗi, tôi chưa thể xử lý câu hỏi này. Vui lòng thử lại.';
      }

      this.logger.log('✅ AI response generated', {
        length: content.length,
        preview: content.substring(0, 100)
      });

      return content;

    } catch (error) {
      this.logger.error('❌ AI generateReply error:', error);
      
      // Fallback responses based on error type
      if (error.code === 'insufficient_quota') {
        return 'Hiện tại dịch vụ AI đang bảo trì. Vui lòng thử lại sau.';
      } else if (error.code === 'rate_limit_exceeded') {
        return 'Hệ thống đang quá tải. Vui lòng đợi một chút và thử lại.';
      } else {
        return 'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.';
      }
    }
  }
}