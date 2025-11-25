// src/trading-account/dto/create-trading-account.dto.ts
import { IsInt, IsNotEmpty, IsOptional, IsString, IsEnum, MinLength } from 'class-validator';
import { TradingAccountStatus } from '@prisma/client';

export class CreateTradingAccountDto {
  @IsInt()
  userId: number;

  @IsString()
  @IsNotEmpty({ message: 'Tên tài khoản không được để trống' })
  @MinLength(3, { message: 'Tên tài khoản ít nhất 3 ký tự' })
  accountName: string;

  @IsOptional()
  @IsString()
  brokerName?: string;

  @IsOptional()
  @IsEnum(TradingAccountStatus, { message: 'Trạng thái không hợp lệ' })
  status?: TradingAccountStatus;
}
