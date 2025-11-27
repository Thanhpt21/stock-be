// src/market-depth/market-depth.module.ts
import { Module } from '@nestjs/common';
import { MarketDepthService } from './market-depth.service';
import { MarketDepthController } from './market-depth.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MarketDepthController],
  providers: [MarketDepthService],
  exports: [MarketDepthService],
})
export class MarketDepthModule {}