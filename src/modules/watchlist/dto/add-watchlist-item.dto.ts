// src/watchlist/dto/add-watchlist-item.dto.ts
import { IsString, IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class AddWatchlistItemDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsString()
  @IsOptional()
  note?: string;
}