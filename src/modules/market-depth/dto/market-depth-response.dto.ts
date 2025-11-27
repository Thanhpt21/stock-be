import { MarketDepthSide } from "@prisma/client";

// src/market-depth/dto/market-depth-response.dto.ts
export class MarketDepthResponseDto {
  id: number;
  symbol: string;
  price: number;
  quantity: number;
  side: MarketDepthSide;
  level: number;
  timestamp: Date;
  isSimulated: boolean;

  constructor(depth: any) {
    this.id = depth.id;
    this.symbol = depth.symbol;
    this.price = Number(depth.price);
    this.quantity = depth.quantity;
    this.side = depth.side;
    this.level = depth.level;
    this.timestamp = depth.timestamp;
    this.isSimulated = depth.isSimulated;
  }
}