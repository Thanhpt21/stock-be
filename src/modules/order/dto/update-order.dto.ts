// src/order/dto/update-order.dto.ts

import { IsNumber, IsOptional, IsPositive, IsInt, IsString, IsEnum } from 'class-validator';
import { OrderType, OrderSide } from '@prisma/client';


export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  symbol?: string;

  @IsEnum(OrderType)
  @IsOptional()
  orderType?: OrderType;

  @IsEnum(OrderSide)
  @IsOptional()
  side?: OrderSide;

  @IsInt()
  @IsPositive()
  @IsOptional()
  quantity?: number;

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
