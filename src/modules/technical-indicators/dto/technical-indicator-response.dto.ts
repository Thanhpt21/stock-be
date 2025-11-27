// src/technical-indicators/dto/technical-indicator-response.dto.ts
export class TechnicalIndicatorResponseDto {
  id: number;
  symbol: string;
  indicator: string;
  value: number;
  timeframe: string;
  date: Date;
  signal?: string;
  createdAt: Date;

  constructor(indicator: any) {
    this.id = indicator.id;
    this.symbol = indicator.symbol;
    this.indicator = indicator.indicator;
    this.value = Number(indicator.value);
    this.timeframe = indicator.timeframe;
    this.date = indicator.date;
    this.signal = indicator.signal;
    this.createdAt = indicator.createdAt;
  }
}