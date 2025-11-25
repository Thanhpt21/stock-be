// src/position/dto/position-response.dto.ts
export class PositionResponseDto {
  id: number;
  accountId: number;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice?: number;
  unrealizedPL: number;
  realizedPL: number;
  lastUpdated: Date;

  constructor(position: any) {
    this.id = position.id;
    this.accountId = position.accountId;
    this.symbol = position.symbol;
    this.quantity = position.quantity;
    this.averagePrice = Number(position.averagePrice);
    this.currentPrice = position.currentPrice ? Number(position.currentPrice) : undefined;
    this.unrealizedPL = Number(position.unrealizedPL);
    this.realizedPL = Number(position.realizedPL);
    this.lastUpdated = position.lastUpdated;
  }
}