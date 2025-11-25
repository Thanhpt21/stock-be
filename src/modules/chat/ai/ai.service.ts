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
  private aiChatEnabled = true; // có thể bật/tắt toàn cục
  private defaultModel = 'gpt-4o-mini'; // hoặc model khác
  private defaultPrompt =
    'Bạn là trợ lý hỗ trợ khách hàng thân thiện, trả lời ngắn gọn và chuyên nghiệp.';

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // 🔹 Kiểm tra xem AI chat có bật không (global)
  async isAiChatEnabled(): Promise<boolean> {
    return this.aiChatEnabled;
  }

  // 🔹 Bật / tắt AI chat (global)
  async setAiChatEnabled(enabled: boolean): Promise<boolean> {
    this.aiChatEnabled = enabled;
    this.logger.log(`AI Chat ${enabled ? 'enabled' : 'disabled'}`);
    return this.aiChatEnabled;
  }

  // 🔹 Tạo phản hồi từ AI (không tenant)
  async generateReply(
    conversationHistory: { senderType: string; message: string }[],
    options?: AiOptions,
  ): Promise<string | null> {
    if (!this.aiChatEnabled) return null;

    const systemPrompt = options?.systemPrompt || this.defaultPrompt;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((m) => ({
        role: m.senderType === 'USER' ? 'user' : 'assistant',
        content: m.message,
      })),
    ] as unknown as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

    try {
      const completion = await this.openai.chat.completions.create({
        model: options?.model || this.defaultModel,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 512,
        messages,
      });

      const reply = completion.choices[0].message?.content ?? null;
      this.logger.log('✅ AI reply generated successfully');
      return reply;
    } catch (error) {
      this.logger.error('❌ AI generateReply error:', error);
      return null;
    }
  }
}
