import { IsNumber, IsOptional } from 'class-validator';

export class UpdatePortfolioItemDto {
  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsOptional()
  averagePrice?: number;
}
