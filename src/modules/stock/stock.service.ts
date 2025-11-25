// src/stock/stock.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

import { StockSearchDto } from './dto/stock-search.dto';
import { StockPriceResponseDto } from './dto/stock-price-response.dto';
import { firstValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';

interface ExternalStockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: string;
  market: string;
}

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  // === GET STOCK PRICE ===
  async getStockPrice(symbol: string) {
    try {
      // 1. Check cache first
      const cached = await this.getCachedStockData(symbol);
      if (cached) {
        return {
          success: true,
          message: 'Lấy giá cổ phiếu thành công (cache)',
          data: new StockPriceResponseDto(cached),
        };
      }

      // 2. Fetch from external API
      const stockData = await this.fetchFromExternalAPI(symbol);
      
      // 3. Cache the data
      await this.cacheStockData(stockData);

      return {
        success: true,
        message: 'Lấy giá cổ phiếu thành công',
        data: new StockPriceResponseDto(stockData),
      };

    } catch (error) {
      this.logger.error(`Error getting stock price for ${symbol}:`, error);
      
      // Fallback to mock data if API fails
      const mockData = await this.getMockStockData(symbol);
      return {
        success: true,
        message: 'Lấy giá cổ phiếu thành công (mock data)',
        data: new StockPriceResponseDto(mockData),
      };
    }
  }

  // === GET BATCH STOCK PRICES ===
  async getBatchStockPrices(symbols: string[]) {
    try {
      const results = await Promise.all(
        symbols.map(symbol => this.getStockPrice(symbol))
      );

      const successfulResults = results
        .filter(result => result.success)
        .map(result => result.data);

      return {
        success: true,
        message: `Lấy giá ${successfulResults.length} mã cổ phiếu thành công`,
        data: successfulResults,
      };
    } catch (error) {
      this.logger.error('Error getting batch stock prices:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy giá hàng loạt cổ phiếu',
        error: error.message,
      };
    }
  }

  // === SEARCH STOCKS ===
  async searchStocks(dto: StockSearchDto) {
    try {
      const { search, market, page = 1, limit = 20 } = dto;
      const skip = (page - 1) * limit;

      // Mock stock data for search (in real app, this would query external API)
      const allStocks = await this.getMockStockList();
      
      let filteredStocks = allStocks;

      if (search) {
        filteredStocks = allStocks.filter(stock =>
          stock.symbol.toLowerCase().includes(search.toLowerCase()) ||
          stock.companyName.toLowerCase().includes(search.toLowerCase())
        );
      }

      if (market) {
        filteredStocks = filteredStocks.filter(stock => stock.market === market);
      }

      const paginatedStocks = filteredStocks.slice(skip, skip + limit);

      return {
        success: true,
        message: 'Tìm kiếm cổ phiếu thành công',
        data: {
          data: paginatedStocks,
          total: filteredStocks.length,
          page,
          pageCount: Math.ceil(filteredStocks.length / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error searching stocks:', error);
      return {
        success: false,
        message: 'Lỗi khi tìm kiếm cổ phiếu',
        error: error.message,
      };
    }
  }

  // === GET MARKET OVERVIEW ===
  async getMarketOverview() {
    try {
      const markets = ['HOSE', 'HNX', 'UPCOM'];
      const overview = await Promise.all(
        markets.map(market => this.getMarketSummary(market))
      );

      return {
        success: true,
        message: 'Lấy tổng quan thị trường thành công',
        data: overview,
      };
    } catch (error) {
      this.logger.error('Error getting market overview:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy tổng quan thị trường',
        error: error.message,
      };
    }
  }

  // === GET TECHNICAL INDICATORS ===
  async getTechnicalIndicators(symbol: string) {
    try {
      // In real app, this would calculate technical indicators
      // For now, return mock data
      const indicators = await this.generateTechnicalIndicators(symbol);

      return {
        success: true,
        message: 'Lấy chỉ số kỹ thuật thành công',
        data: indicators,
      };
    } catch (error) {
      this.logger.error(`Error getting technical indicators for ${symbol}:`, error);
      return {
        success: false,
        message: 'Lỗi khi lấy chỉ số kỹ thuật',
        error: error.message,
      };
    }
  }

  // === GET MARKET NEWS ===
  async getMarketNews(symbol?: string, limit: number = 10) {
    try {
      const news = await this.prisma.marketNews.findMany({
        where: symbol ? { symbol } : {},
        take: limit,
        orderBy: { publishedAt: 'desc' },
      });

      return {
        success: true,
        message: 'Lấy tin tức thị trường thành công',
        data: news,
      };
    } catch (error) {
      this.logger.error('Error getting market news:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy tin tức thị trường',
        error: error.message,
      };
    }
  }

  // === PRIVATE METHODS ===

private async getCachedStockData(symbol: string): Promise<StockPriceResponseDto | null> {
  try {
    const cached = await this.prisma.stockDataCache.findUnique({
      where: { symbol },
    });

    if (cached && new Date(cached.expiresAt) > new Date()) {
      const data = cached.data as any;
      return new StockPriceResponseDto({
        symbol: data.symbol,
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        volume: data.volume,
        high: data.high,
        low: data.low,
        open: data.open,
        previousClose: data.previousClose,
        timestamp: new Date(data.timestamp), // Convert string back to Date
        market: data.market,
      });
    }

    return null;
  } catch (error) {
    this.logger.error(`Error getting cached data for ${symbol}:`, error);
    return null;
  }
}
private async cacheStockData(stockData: StockPriceResponseDto) {
  try {
    // Convert DTO to plain object for Prisma Json field
    const plainData = {
      symbol: stockData.symbol,
      price: stockData.price,
      change: stockData.change,
      changePercent: stockData.changePercent,
      volume: stockData.volume,
      high: stockData.high,
      low: stockData.low,
      open: stockData.open,
      previousClose: stockData.previousClose,
      timestamp: stockData.timestamp.toISOString(),
      market: stockData.market,
    };

    await this.prisma.stockDataCache.upsert({
      where: { symbol: stockData.symbol },
      update: {
        data: plainData, // Use plain object instead of DTO instance
        lastUpdated: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes cache
      },
      create: {
        symbol: stockData.symbol,
        data: plainData, // Use plain object instead of DTO instance
        lastUpdated: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      },
    });
  } catch (error) {
    this.logger.error(`Error caching stock data for ${stockData.symbol}:`, error);
  }
}

  private async fetchFromExternalAPI(symbol: string): Promise<StockPriceResponseDto> {
    // Mock external API call - replace with real API like FireAnt, Vietstock, etc.
    // For now, return mock data
    return this.getMockStockData(symbol);
  }

  // === MOCK DATA GENERATORS (Replace with real API calls) ===

  private async getMockStockData(symbol: string): Promise<StockPriceResponseDto> {
    const basePrice = this.getBasePrice(symbol);
    const change = (Math.random() - 0.5) * 2000;
    const changePercent = (change / basePrice) * 100;

    return new StockPriceResponseDto({
      symbol,
      price: basePrice + change,
      change,
      changePercent: Number(changePercent.toFixed(2)),
      volume: Math.floor(Math.random() * 10000000),
      high: basePrice + Math.random() * 1000,
      low: basePrice - Math.random() * 500,
      open: basePrice + (Math.random() - 0.5) * 500,
      previousClose: basePrice,
      timestamp: new Date(),
      market: this.getMarketFromSymbol(symbol),
    });
  }

  private async getMockStockList() {
    const stocks = [
      { symbol: 'VIC', companyName: 'Tập đoàn Vingroup', market: 'HOSE' },
      { symbol: 'VNM', companyName: 'Công ty Cổ phần Sữa Việt Nam', market: 'HOSE' },
      { symbol: 'HPG', companyName: 'Công ty Cổ phần Tập đoàn Hòa Phát', market: 'HOSE' },
      { symbol: 'SSI', companyName: 'Công ty Cổ phần Chứng khoán SSI', market: 'HOSE' },
      { symbol: 'FPT', companyName: 'Công ty Cổ phần FPT', market: 'HOSE' },
      { symbol: 'ACB', companyName: 'Ngân hàng TMCP Á Châu', market: 'HNX' },
      { symbol: 'SHB', companyName: 'Ngân hàng TMCP Sài Gòn - Hà Nội', market: 'HNX' },
      { symbol: 'OCH', companyName: 'Công ty Cổ phần Tập đoàn Phát triển Đô thị và KCN OCH', market: 'UPCOM' },
    ];

    // Add current prices
    const stocksWithPrices = await Promise.all(
      stocks.map(async stock => ({
        ...stock,
        ...(await this.getMockStockData(stock.symbol)),
      }))
    );

    return stocksWithPrices;
  }

  private async getMarketSummary(market: string) {
    const stocks = await this.getMockStockList();
    const marketStocks = stocks.filter(stock => stock.market === market);

    const totalChange = marketStocks.reduce((sum, stock) => sum + stock.changePercent, 0);
    const avgChange = totalChange / marketStocks.length;

    return {
      market,
      totalStocks: marketStocks.length,
      averageChange: Number(avgChange.toFixed(2)),
      totalVolume: marketStocks.reduce((sum, stock) => sum + stock.volume, 0),
    };
  }

  private async generateTechnicalIndicators(symbol: string) {
    const stockData = await this.getMockStockData(symbol);
    
    // Mock technical indicators calculation
    return {
      symbol,
      rsi: Number((30 + Math.random() * 40).toFixed(2)), // RSI 30-70
      macd: Number((Math.random() - 0.5).toFixed(4)),
      ema20: Number((stockData.price * (0.95 + Math.random() * 0.1)).toFixed(2)),
      ema50: Number((stockData.price * (0.9 + Math.random() * 0.2)).toFixed(2)),
      sma20: Number((stockData.price * (0.96 + Math.random() * 0.08)).toFixed(2)),
      sma50: Number((stockData.price * (0.92 + Math.random() * 0.16)).toFixed(2)),
      signal: ['BUY', 'SELL', 'HOLD'][Math.floor(Math.random() * 3)],
      strength: Number((Math.random() * 100).toFixed(2)),
      lastUpdated: new Date(),
    };
  }

  private getBasePrice(symbol: string): number {
    const basePrices: { [key: string]: number } = {
      'VIC': 46500,
      'VNM': 79200,
      'HPG': 28500,
      'SSI': 35200,
      'FPT': 67800,
      'ACB': 31200,
      'SHB': 12400,
      'OCH': 8900,
    };
    return basePrices[symbol] || 20000;
  }

  private getMarketFromSymbol(symbol: string): string {
    const hoseStocks = ['VIC', 'VNM', 'HPG', 'SSI', 'FPT'];
    const hnxStocks = ['ACB', 'SHB'];
    
    if (hoseStocks.includes(symbol)) return 'HOSE';
    if (hnxStocks.includes(symbol)) return 'HNX';
    return 'UPCOM';
  }

  // === SCHEDULED TASKS ===
  @Cron(CronExpression.EVERY_MINUTE)
  async updateStockDataCache() {
    this.logger.log('Updating stock data cache...');
    
    try {
      const symbols = ['VIC', 'VNM', 'HPG', 'SSI', 'FPT', 'ACB', 'SHB', 'OCH'];
      
      for (const symbol of symbols) {
        const stockData = await this.getMockStockData(symbol);
        await this.cacheStockData(stockData);
      }
      
      this.logger.log('Stock data cache updated successfully');
    } catch (error) {
      this.logger.error('Error updating stock data cache:', error);
    }
  }
}