// src/stock/dto/stock-price-response.dto.ts
export class StockPriceResponseDto {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: Date;
  market: string;

  constructor(partial: Partial<StockPriceResponseDto>) {
    Object.assign(this, partial);
  }
}