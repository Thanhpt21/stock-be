import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdatePortfolioItemDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  averagePrice?: number;
}
