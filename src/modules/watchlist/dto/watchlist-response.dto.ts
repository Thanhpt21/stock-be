// src/watchlist/dto/watchlist-response.dto.ts
import { Watchlist, WatchlistItem, StockAlert, StockAlertType } from '@prisma/client';

export class WatchlistItemResponseDto {
  id: number;
  symbol: string;
  note?: string;
  createdAt: Date;

  constructor(watchlistItem: WatchlistItem) {
    this.id = watchlistItem.id;
    this.symbol = watchlistItem.symbol;
    this.note = watchlistItem.note || undefined;
    this.createdAt = watchlistItem.createdAt;
  }
}

export class WatchlistResponseDto {
  id: number;
  name: string;
  isDefault: boolean;
  itemCount: number;
  items: WatchlistItemResponseDto[];
  createdAt: Date;
  updatedAt: Date;

  constructor(watchlist: Watchlist & { items: WatchlistItem[] }) {
    this.id = watchlist.id;
    this.name = watchlist.name;
    this.isDefault = watchlist.isDefault;
    this.itemCount = watchlist.items.length;
    this.items = watchlist.items.map(item => new WatchlistItemResponseDto(item));
    this.createdAt = watchlist.createdAt;
    this.updatedAt = watchlist.updatedAt;
  }
}

export class StockAlertResponseDto {
  id: number;
  symbol: string;
  alertType: StockAlertType;
  targetValue: number;
  isActive: boolean;
  triggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(stockAlert: StockAlert) {
    this.id = stockAlert.id;
    this.symbol = stockAlert.symbol;
    this.alertType = stockAlert.alertType;
    this.targetValue = Number(stockAlert.targetValue);
    this.isActive = stockAlert.isActive;
    this.triggeredAt = stockAlert.triggeredAt || undefined;
    this.createdAt = stockAlert.createdAt;
    this.updatedAt = stockAlert.updatedAt;
  }
}