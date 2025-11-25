// src/watchlist/dto/update-watchlist.dto.ts
import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateWatchlistDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}