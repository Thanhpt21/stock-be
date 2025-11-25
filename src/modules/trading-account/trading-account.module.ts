// src/trading-account/trading-account.module.ts
import { Module } from '@nestjs/common';
import { TradingAccountService } from './trading-account.service';
import { TradingAccountController } from './trading-account.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TradingAccountController],
  providers: [TradingAccountService],
  exports: [TradingAccountService],
})
export class TradingAccountModule {}
