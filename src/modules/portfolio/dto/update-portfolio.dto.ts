import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdatePortfolioDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
