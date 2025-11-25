import { IsOptional, IsInt } from 'class-validator';

export class UpdateUserRoleDto {
  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsInt()
  roleId?: number;
}
