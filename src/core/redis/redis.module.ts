import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (config: ConfigService) => {
        const redisConfig = config.get('redis');
        return new Redis({
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          db: redisConfig.db,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000); // Tăng dần thời gian retry
            return delay;
          },
          maxRetriesPerRequest: null,  // Tăng số lần retry tối đa
          connectTimeout: 10000, // Thời gian timeout khi kết nối (10s)
          keepAlive: 60000, // Giữ kết nối sống trong 1 phút
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'REDIS_TTL',
      useFactory: (config: ConfigService) => config.get<number>('redis.ttl', 604800),
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT', 'REDIS_TTL'],
})
export class RedisModule {}


