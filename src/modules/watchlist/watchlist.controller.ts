// src/watchlist/watchlist.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
  Request 
} from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { UpdateWatchlistDto } from './dto/update-watchlist.dto';
import { AddWatchlistItemDto } from './dto/add-watchlist-item.dto';
import { CreateStockAlertDto } from './dto/create-stock-alert.dto';
import { UpdateStockAlertDto } from './dto/update-stock-alert.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';


@Controller('watchlist')
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  // ==================== WATCHLIST ENDPOINTS ====================

  @Get()
  async getUserWatchlists(@Request() req) {
    return this.watchlistService.getUserWatchlists(req.user.id);
  }

  @Post()
  async createWatchlist(@Request() req, @Body() createWatchlistDto: CreateWatchlistDto) {
    return this.watchlistService.createWatchlist(req.user.id, createWatchlistDto);
  }

  @Put(':id')
  async updateWatchlist(
    @Request() req, 
    @Param('id') watchlistId: string,
    @Body() updateWatchlistDto: UpdateWatchlistDto
  ) {
    return this.watchlistService.updateWatchlist(req.user.id, parseInt(watchlistId), updateWatchlistDto);
  }

  @Delete(':id')
  async deleteWatchlist(@Request() req, @Param('id') watchlistId: string) {
    return this.watchlistService.deleteWatchlist(req.user.id, parseInt(watchlistId));
  }

  // ==================== WATCHLIST ITEMS ENDPOINTS ====================

  @Post(':id/items')
  async addToWatchlist(
    @Request() req,
    @Param('id') watchlistId: string,
    @Body() addItemDto: AddWatchlistItemDto
  ) {
    return this.watchlistService.addToWatchlist(req.user.id, parseInt(watchlistId), addItemDto);
  }

  @Delete(':id/items/:symbol')
  async removeFromWatchlist(
    @Request() req,
    @Param('id') watchlistId: string,
    @Param('symbol') symbol: string
  ) {
    return this.watchlistService.removeFromWatchlist(req.user.id, parseInt(watchlistId), symbol);
  }

  @Get(':id/with-stocks')
  async getWatchlistWithStockData(
    @Request() req,
    @Param('id') watchlistId: string
  ) {
    return this.watchlistService.getWatchlistWithStockData(req.user.id, parseInt(watchlistId));
  }

  // ==================== STOCK ALERTS ENDPOINTS ====================

  @Get('alerts')
  async getUserAlerts(@Request() req) {
    return this.watchlistService.getUserAlerts(req.user.id);
  }

  @Post('alerts')
  async createStockAlert(@Request() req, @Body() createAlertDto: CreateStockAlertDto) {
    return this.watchlistService.createStockAlert(req.user.id, createAlertDto);
  }

  @Put('alerts/:id')
  async updateStockAlert(
    @Request() req,
    @Param('id') alertId: string,
    @Body() updateAlertDto: UpdateStockAlertDto
  ) {
    return this.watchlistService.updateStockAlert(req.user.id, parseInt(alertId), updateAlertDto);
  }

  @Delete('alerts/:id')
  async deleteStockAlert(@Request() req, @Param('id') alertId: string) {
    return this.watchlistService.deleteStockAlert(req.user.id, parseInt(alertId));
  }
}