import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

export interface ChatMessageRedis {
  id: string;
  sessionId?: string;
  senderId?: number | null;
  senderType: 'USER' | 'BOT';
  message: string;
  metadata?: any;
  createdAt: string;
}

@Injectable()
export class ChatRedisService {
  private readonly redis: Redis;
  private readonly ttl: number;

  constructor(
    @Inject('REDIS_CLIENT') redis: Redis,
    @Inject('REDIS_TTL') ttl: number,
  ) {
    this.redis = redis;
    this.ttl = ttl;
  }

  // Keys
  private sessionMessagesKey(sessionId: string): string {
    return `chat:session:${sessionId}:messages`;
  }

  // Session Messages
  async saveSessionMessage(
    sessionId: string,
    message: ChatMessageRedis,
  ): Promise<void> {
    const key = this.sessionMessagesKey(sessionId);
    await this.redis.rpush(key, JSON.stringify(message));
    await this.redis.expire(key, this.ttl);
  }

  async getSessionMessages(sessionId: string): Promise<ChatMessageRedis[]> {
    const key = this.sessionMessagesKey(sessionId);
    const messages = await this.redis.lrange(key, 0, -1);
    return messages.map((msg) => JSON.parse(msg));
  }

  async clearSessionMessages(sessionId: string): Promise<void> {
    const key = this.sessionMessagesKey(sessionId);
    await this.redis.del(key);
  }

  // Cleanup
  async onModuleDestroy() {
    await this.redis.quit();
  }
}