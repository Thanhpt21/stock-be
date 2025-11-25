// src/order/dto/create-order.dto.ts
import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { OrderType, OrderSide } from '@prisma/client';

export class CreateOrderDto {
  @IsInt()
  accountId: number;

  @IsString()
  symbol: string;

  @IsEnum(OrderType)
  orderType: OrderType;

  @IsEnum(OrderSide)
  side: OrderSide;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  stopPrice?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}