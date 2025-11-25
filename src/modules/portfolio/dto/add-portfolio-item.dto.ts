import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class AddPortfolioItemDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  averagePrice: number;
}
