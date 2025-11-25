import { IsOptional, IsString, IsObject, IsInt } from 'class-validator';

export class UpdateAuditLogDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsInt()
  resourceId?: number;

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
