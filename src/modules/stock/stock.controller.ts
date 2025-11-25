// src/stock/stock.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  Post,
  Body,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { StockSearchDto } from './dto/stock-search.dto';
import { StockBatchRequestDto } from './dto/stock-batch-request.dto';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';


@Controller('stocks')
@UseGuards(JwtAuthGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // === GET STOCK PRICE BY SYMBOL ===
  @Get('price/:symbol')
  async getStockPrice(@Query('symbol') symbol: string) {
    return this.stockService.getStockPrice(symbol);
  }

  // === GET MULTIPLE STOCK PRICES ===
  @Post('prices/batch')
  async getBatchStockPrices(@Body() dto: StockBatchRequestDto) {
    return this.stockService.getBatchStockPrices(dto.symbols);
  }

  // === SEARCH STOCKS ===
  @Get('search')
  async searchStocks(@Query() dto: StockSearchDto) {
    return this.stockService.searchStocks(dto);
  }

  // === GET MARKET OVERVIEW ===
  @Get('market/overview')
  async getMarketOverview() {
    return this.stockService.getMarketOverview();
  }

  // === GET TECHNICAL INDICATORS ===
  @Get('technical/:symbol')
  async getTechnicalIndicators(@Query('symbol') symbol: string) {
    return this.stockService.getTechnicalIndicators(symbol);
  }

  // === GET MARKET NEWS ===
  @Get('news')
  async getMarketNews(
    @Query('symbol') symbol?: string,
    @Query('limit') limit: number = 10
  ) {
    return this.stockService.getMarketNews(symbol, limit);
  }
}