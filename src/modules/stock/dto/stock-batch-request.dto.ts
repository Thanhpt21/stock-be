// src/stock/dto/stock-batch-request.dto.ts
import { IsArray, IsNotEmpty } from 'class-validator';

export class StockBatchRequestDto {
  @IsArray()
  @IsNotEmpty()
  symbols: string[];
}