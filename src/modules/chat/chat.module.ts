import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat.controller';

import { ChatGateway } from './chat.gateway';
import { ChatRedisService } from './redis/chat-redis.service';
import redisConfig from '../../config/redis.config';
import { PrismaModule } from 'prisma/prisma.module';
import { ChatService } from './chat.service';
import { RedisModule } from 'src/core/redis/redis.module';
import { AiService } from './ai/ai.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forFeature(redisConfig),
    RedisModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ChatRedisService, AiService],
  exports: [ChatService, ChatRedisService, AiService],
})
export class ChatModule {}