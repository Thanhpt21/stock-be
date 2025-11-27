// src/market-depth/dto/create-market-depth.dto.ts
import { IsString, IsNumber, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { MarketDepthSide } from '@prisma/client';

export class CreateMarketDepthDto {
  @IsString()
  symbol: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;

  @IsEnum(MarketDepthSide) // Sử dụng enum mới
  side: MarketDepthSide;

  @IsNumber()
  level: number;

  @IsBoolean()
  @IsOptional()
  isSimulated?: boolean = true;
}