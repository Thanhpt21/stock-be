// src/market-depth/dto/market-depth-query.dto.ts
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { MarketDepthSide } from '@prisma/client';

export class MarketDepthQueryDto {
  @IsString()
  @IsOptional()
  symbol?: string;

  @IsEnum(MarketDepthSide)
  @IsOptional()
  side?: MarketDepthSide;

  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}