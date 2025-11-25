// src/order/order.module.ts
import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PositionService } from '../position/position.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrderController],
  providers: [OrderService, PositionService],
  exports: [OrderService],
})
export class OrderModule {}