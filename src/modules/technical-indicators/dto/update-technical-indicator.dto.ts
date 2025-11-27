// src/technical-indicators/dto/update-technical-indicator.dto.ts
import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsDate,
  IsEnum 
} from 'class-validator';

export class UpdateTechnicalIndicatorDto {
  @IsString()
  @IsOptional()
  symbol?: string;

  @IsString()
  @IsOptional()
  indicator?: string;

  @IsNumber()
  @IsOptional()
  value?: number;

  @IsString()
  @IsOptional()
  timeframe?: string;

  @IsDate()
  @IsOptional()
  date?: Date;

  @IsString()
  @IsOptional()
  signal?: string;
}