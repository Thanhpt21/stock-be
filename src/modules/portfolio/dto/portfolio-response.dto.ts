import { Portfolio, PortfolioItem } from '@prisma/client';

export class PortfolioItemResponseDto {
  id: number;
  symbol: string;
  quantity: number;
  averagePrice: number;
  createdAt: Date;

  constructor(item: PortfolioItem) {
    this.id = item.id;
    this.symbol = item.symbol;
    this.quantity = Number(item.quantity);
    this.averagePrice = Number(item.averagePrice);
    this.createdAt = item.createdAt;
  }
}

export class PortfolioResponseDto {
  id: number;
  name: string;
  description?: string;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
  items: PortfolioItemResponseDto[];

  constructor(portfolio: Portfolio & { items: PortfolioItem[] }) {
    this.id = portfolio.id;
    this.name = portfolio.name;
    this.description = portfolio.description || undefined;
    this.itemCount = portfolio.items.length;
    this.items = portfolio.items.map((i) => new PortfolioItemResponseDto(i));
    this.createdAt = portfolio.createdAt;
    this.updatedAt = portfolio.updatedAt;
  }
}
