// src/order/dto/create-order.dto.ts
import { IsNumber, IsString, IsEnum, IsOptional, Min, IsPositive } from 'class-validator';
import { OrderType, OrderSide } from '@prisma/client';

export class CreateOrderDto {
  @IsNumber()
  accountId: number;

  @IsString()
  symbol: string;

  @IsEnum(OrderType)
  orderType: OrderType;

  @IsEnum(OrderSide)
  side: OrderSide;

  @IsNumber()
  @Min(100)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  stopPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  // ✅ THÊM: Nhận giá hiện tại từ client
  @IsNumber()
  @IsPositive()
  currentPrice: number;
}