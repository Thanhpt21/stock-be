import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface ChatMessageRedis {
  id: string;
  conversationId?: number;
  sessionId?: string;
  senderId?: number;
  senderType: 'USER' | 'GUEST' | 'BOT' | 'ADMIN';
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

  private sessionInfoKey(sessionId: string): string {
    return `chat:session:${sessionId}:info`;
  }

  private onlineUsersKey(): string {
    return `chat:online:users`;
  }

  private typingKey(conversationId: number): string {
    return `chat:typing:${conversationId}`;
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

    // Lưu sessionId của khách vào Redis
  async setGuestSession(sessionId: string): Promise<void> {
    // Bạn có thể lưu sessionId vào Redis với một khóa cụ thể, ví dụ: 'guest-session:<sessionId>'
    await this.redis.set(`guest-session:${sessionId}`, 'active', 'EX', 3600); // Lưu với thời gian sống 1 giờ (3600 giây)
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

  // Session Info
  async saveSessionInfo(sessionId: string, info: any): Promise<void> {
    const key = this.sessionInfoKey(sessionId);
    await this.redis.set(key, JSON.stringify(info), 'EX', this.ttl);
  }

  async getSessionInfo(sessionId: string): Promise<any> {
    const key = this.sessionInfoKey(sessionId);
    const info = await this.redis.get(key);
    return info ? JSON.parse(info) : null;
  }

  // Online Users
  async setUserOnline(userId: number): Promise<void> {
    await this.redis.sadd(this.onlineUsersKey(), userId.toString());
  }

  async setUserOffline(userId: number): Promise<void> {
    await this.redis.srem(this.onlineUsersKey(), userId.toString());
  }

  async isUserOnline(userId: number): Promise<boolean> {
    const result = await this.redis.sismember(
      this.onlineUsersKey(),
      userId.toString(),
    );
    return result === 1;
  }

  async getOnlineUsers(): Promise<number[]> {
    const users = await this.redis.smembers(this.onlineUsersKey());
    return users.map((u) => parseInt(u, 10));
  }

  // Typing Indicator
  async setTyping(
    conversationId: number,
    userId: number,
    isTyping: boolean,
  ): Promise<void> {
    const key = this.typingKey(conversationId);
    if (isTyping) {
      await this.redis.setex(key, 5, userId.toString()); // 5 seconds
    } else {
      await this.redis.del(key);
    }
  }

  async getTypingUser(conversationId: number): Promise<number | null> {
    const key = this.typingKey(conversationId);
    const userId = await this.redis.get(key);
    return userId ? parseInt(userId, 10) : null;
  }

  // Cleanup
  async onModuleDestroy() {
    await this.redis.quit();
  }
}