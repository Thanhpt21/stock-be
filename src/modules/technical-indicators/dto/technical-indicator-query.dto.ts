// src/technical-indicators/dto/technical-indicator-query.dto.ts
import { IsString, IsOptional, IsDate, IsNumber } from 'class-validator';

export class TechnicalIndicatorQueryDto {
  @IsString()
  @IsOptional()
  symbol?: string;

  @IsString()
  @IsOptional()
  indicator?: string;

  @IsString()
  @IsOptional()
  timeframe?: string;

  @IsDate()
  @IsOptional()
  fromDate?: Date;

  @IsDate()
  @IsOptional()
  toDate?: Date;

  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}