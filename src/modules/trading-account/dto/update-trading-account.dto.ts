// src/trading-account/dto/update-trading-account.dto.ts
import { IsOptional, IsString, IsEnum, MinLength } from 'class-validator';
import { TradingAccountStatus } from '@prisma/client';

export class UpdateTradingAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Tên tài khoản ít nhất 3 ký tự' })
  accountName?: string;

  @IsOptional()
  @IsString()
  brokerName?: string;

  @IsOptional()
  @IsEnum(TradingAccountStatus, { message: 'Trạng thái không hợp lệ' })
  status?: TradingAccountStatus;
}
