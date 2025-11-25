// src/watchlist/watchlist.service.ts
import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { UpdateWatchlistDto } from './dto/update-watchlist.dto';
import { AddWatchlistItemDto } from './dto/add-watchlist-item.dto';
import { CreateStockAlertDto } from './dto/create-stock-alert.dto';
import { UpdateStockAlertDto } from './dto/update-stock-alert.dto';
import { WatchlistResponseDto, StockAlertResponseDto, WatchlistItemResponseDto } from './dto/watchlist-response.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class WatchlistService {
  private readonly logger = new Logger(WatchlistService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== WATCHLIST CRUD ====================

  async getUserWatchlists(userId: number) {
    const watchlists = await this.prisma.watchlist.findMany({
      where: { userId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    });

    return {
      success: true,
      message: 'Lấy danh sách watchlist thành công',
      data: watchlists.map(watchlist => new WatchlistResponseDto(watchlist))
    };
  }

  async createWatchlist(userId: number, createWatchlistDto: CreateWatchlistDto) {
    const { name, isDefault = false } = createWatchlistDto;

    // If setting as default, remove default from other watchlists
    if (isDefault) {
      await this.prisma.watchlist.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const watchlist = await this.prisma.watchlist.create({
      data: {
        userId,
        name,
        isDefault,
        items: { create: [] }
      },
      include: {
        items: true
      }
    });

    return {
      success: true,
      message: 'Tạo watchlist thành công',
      data: new WatchlistResponseDto(watchlist)
    };
  }

  async updateWatchlist(userId: number, watchlistId: number, updateWatchlistDto: UpdateWatchlistDto) {
    const watchlist = await this.prisma.watchlist.findFirst({
      where: { id: watchlistId, userId }
    });

    if (!watchlist) {
      throw new NotFoundException('Watchlist không tồn tại');
    }

    // If setting as default, remove default from other watchlists
    if (updateWatchlistDto.isDefault) {
      await this.prisma.watchlist.updateMany({
        where: { userId, isDefault: true, id: { not: watchlistId } },
        data: { isDefault: false }
      });
    }

    const updatedWatchlist = await this.prisma.watchlist.update({
      where: { id: watchlistId },
      data: updateWatchlistDto,
      include: {
        items: true
      }
    });

    return {
      success: true,
      message: 'Cập nhật watchlist thành công',
      data: new WatchlistResponseDto(updatedWatchlist)
    };
  }

  async deleteWatchlist(userId: number, watchlistId: number) {
    const watchlist = await this.prisma.watchlist.findFirst({
      where: { id: watchlistId, userId }
    });

    if (!watchlist) {
      throw new NotFoundException('Watchlist không tồn tại');
    }

    await this.prisma.watchlist.delete({
      where: { id: watchlistId }
    });

    return {
      success: true,
      message: 'Xóa watchlist thành công'
    };
  }

  // ==================== WATCHLIST ITEMS ====================

  async addToWatchlist(userId: number, watchlistId: number, addItemDto: AddWatchlistItemDto) {
    const watchlist = await this.prisma.watchlist.findFirst({
      where: { id: watchlistId, userId }
    });

    if (!watchlist) {
      throw new NotFoundException('Watchlist không tồn tại');
    }

    // Check if symbol already exists in watchlist
    const existingItem = await this.prisma.watchlistItem.findFirst({
      where: { watchlistId, symbol: addItemDto.symbol }
    });

    if (existingItem) {
      throw new ConflictException('Mã cổ phiếu đã tồn tại trong watchlist');
    }

    const watchlistItem = await this.prisma.watchlistItem.create({
      data: {
        watchlistId,
        symbol: addItemDto.symbol,
        note: addItemDto.note
      }
    });

    // Return the updated watchlist with all items
    const updatedWatchlist = await this.prisma.watchlist.findFirst({
      where: { id: watchlistId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return {
      success: true,
      message: 'Thêm cổ phiếu vào watchlist thành công',
      data: new WatchlistResponseDto(updatedWatchlist!)
    };
  }

  async removeFromWatchlist(userId: number, watchlistId: number, symbol: string) {
    const watchlist = await this.prisma.watchlist.findFirst({
      where: { id: watchlistId, userId }
    });

    if (!watchlist) {
      throw new NotFoundException('Watchlist không tồn tại');
    }

    const watchlistItem = await this.prisma.watchlistItem.findFirst({
      where: { watchlistId, symbol }
    });

    if (!watchlistItem) {
      throw new NotFoundException('Mã cổ phiếu không tồn tại trong watchlist');
    }

    await this.prisma.watchlistItem.delete({
      where: { id: watchlistItem.id }
    });

    // Return the updated watchlist with all items
    const updatedWatchlist = await this.prisma.watchlist.findFirst({
      where: { id: watchlistId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return {
      success: true,
      message: 'Xóa cổ phiếu khỏi watchlist thành công',
      data: new WatchlistResponseDto(updatedWatchlist!)
    };
  }

  // ==================== STOCK ALERTS ====================

  async getUserAlerts(userId: number) {
    const alerts = await this.prisma.stockAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách cảnh báo thành công',
      data: alerts.map(alert => new StockAlertResponseDto(alert))
    };
  }

  async createStockAlert(userId: number, createAlertDto: CreateStockAlertDto) {
    const alert = await this.prisma.stockAlert.create({
      data: {
        userId,
        ...createAlertDto,
        targetValue: createAlertDto.targetValue
      }
    });

    return {
      success: true,
      message: 'Tạo cảnh báo thành công',
      data: new StockAlertResponseDto(alert)
    };
  }

  async updateStockAlert(userId: number, alertId: number, updateAlertDto: UpdateStockAlertDto) {
    const alert = await this.prisma.stockAlert.findFirst({
      where: { id: alertId, userId }
    });

    if (!alert) {
      throw new NotFoundException('Cảnh báo không tồn tại');
    }

    const updatedAlert = await this.prisma.stockAlert.update({
      where: { id: alertId },
      data: updateAlertDto
    });

    return {
      success: true,
      message: 'Cập nhật cảnh báo thành công',
      data: new StockAlertResponseDto(updatedAlert)
    };
  }

  async deleteStockAlert(userId: number, alertId: number) {
    const alert = await this.prisma.stockAlert.findFirst({
      where: { id: alertId, userId }
    });

    if (!alert) {
      throw new NotFoundException('Cảnh báo không tồn tại');
    }

    await this.prisma.stockAlert.delete({
      where: { id: alertId }
    });

    return {
      success: true,
      message: 'Xóa cảnh báo thành công'
    };
  }

  // ==================== BATCH OPERATIONS ====================

  async getWatchlistWithStockData(userId: number, watchlistId: number) {
    const watchlist = await this.prisma.watchlist.findFirst({
      where: { id: watchlistId, userId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!watchlist) {
      throw new NotFoundException('Watchlist không tồn tại');
    }

    // Get real-time stock data for all symbols in watchlist
    const symbols = watchlist.items.map(item => item.symbol);
    const stockData = await this.getStockDataForSymbols(symbols);

    const itemsWithData = watchlist.items.map(item => ({
      ...new WatchlistItemResponseDto(item),
      stockData: stockData.find(stock => stock.symbol === item.symbol) || null
    }));

    return {
      success: true,
      message: 'Lấy watchlist với dữ liệu cổ phiếu thành công',
      data: {
        ...new WatchlistResponseDto(watchlist),
        items: itemsWithData
      }
    };
  }

  private async getStockDataForSymbols(symbols: string[]) {
    // This would integrate with your existing stock service
    // For now, return mock data
    return symbols.map(symbol => ({
      symbol,
      price: Math.random() * 100000,
      change: (Math.random() - 0.5) * 2000,
      changePercent: (Math.random() - 0.5) * 10,
      volume: Math.floor(Math.random() * 10000000)
    }));
  }
}