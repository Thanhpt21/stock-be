import { Type } from 'class-transformer';
import { IsString, IsOptional, IsInt, IsObject, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
   @Type(() => Number)
  @IsInt()
  conversationId?: number;

  @IsString()
  @MinLength(1, { message: 'Tin nhắn không được để trống' })
  message: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class MigrateMessagesDto {
  @IsString()
  @MinLength(1)
  sessionId: string;

  @IsInt()
  userId: number;

  @IsInt()
  tenantId: number;
}

export class GetMessagesDto {
  @IsOptional()
  @IsInt()
  conversationId?: number;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsInt()
  userId?: number;
}