// src/watchlist/dto/update-stock-alert.dto.ts
import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';
import { StockAlertType } from '@prisma/client';

export class UpdateStockAlertDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  symbol?: string;

  @IsEnum(StockAlertType)
  @IsOptional()
  alertType?: StockAlertType;

  @IsNumber()
  @IsOptional()
  targetValue?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}