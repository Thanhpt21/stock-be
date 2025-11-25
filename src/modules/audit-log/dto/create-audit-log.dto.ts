import { IsInt, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateAuditLogDto {
  @IsOptional()
  @IsInt()
  userId?: number;

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsInt()
  resourceId?: number;

  @IsString()
  method: string; // bắt buộc

  @IsString()
  route: string; // bắt buộc

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
