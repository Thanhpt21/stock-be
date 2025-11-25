import { IsNumber, IsString, IsNotEmpty, IsPositive } from 'class-validator';

export class CreatePortfolioItemDto {
  @IsNumber()
  portfolioId: number;

  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  averagePrice: number;
}
