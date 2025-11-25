// src/watchlist/dto/create-stock-alert.dto.ts
import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';
import { StockAlertType } from '@prisma/client';

export class CreateStockAlertDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsEnum(StockAlertType)
  alertType: StockAlertType;

  @IsNumber()
  targetValue: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}