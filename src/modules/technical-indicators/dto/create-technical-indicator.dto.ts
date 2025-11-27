// src/technical-indicators/dto/create-technical-indicator.dto.ts
import { IsString, IsNumber, IsDateString } from 'class-validator';

export class CreateTechnicalIndicatorDto {
  @IsString()
  symbol: string;

  @IsString()
  indicator: string;  // 'RSI', 'MACD', 'EMA_20', 'BB_UPPER', etc.

  @IsNumber()
  value: number;

  @IsString()
  timeframe: string;  // '1h', '4h', '1d', '1w'

  @IsDateString()
  date: string;
}