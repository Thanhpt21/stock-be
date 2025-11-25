// src/order/dto/order-stats-response.dto.ts
export class OrderStatsResponseDto {
  totalOrders: number;
  pendingOrders: number;
  filledOrders: number;
  cancelledOrders: number;
  totalBuyOrders: number;
  totalSellOrders: number;
  successRate: number;
  totalVolume: number;
  totalValue: number;

  constructor(stats: any) {
    this.totalOrders = stats.totalOrders;
    this.pendingOrders = stats.pendingOrders;
    this.filledOrders = stats.filledOrders;
    this.cancelledOrders = stats.cancelledOrders;
    this.totalBuyOrders = stats.totalBuyOrders;
    this.totalSellOrders = stats.totalSellOrders;
    this.successRate = stats.successRate;
    this.totalVolume = stats.totalVolume;
    this.totalValue = stats.totalValue;
  }
}