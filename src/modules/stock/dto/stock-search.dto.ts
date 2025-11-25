// src/stock/dto/stock-search.dto.ts
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class StockSearchDto {
  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  market?: string; // HOSE, HNX, UPCOM

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}