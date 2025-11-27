// src/market-depth/market-depth.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateMarketDepthDto } from './dto/create-market-depth.dto';
import { MarketDepthQueryDto } from './dto/market-depth-query.dto';
import { MarketDepthResponseDto } from './dto/market-depth-response.dto';
import { MarketDepthSide, OrderSide } from '@prisma/client';

@Injectable()
export class MarketDepthService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateMarketDepthDto) {
    const depth = await this.prisma.marketDepth.create({
      data: {
        ...createDto,
        timestamp: new Date(),
      },
    });

    return {
      success: true,
      message: 'Tạo dữ liệu độ sâu thành công',
      data: new MarketDepthResponseDto(depth),
    };
  }

  async findAll(query: MarketDepthQueryDto) {
    const { symbol, side, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (symbol) where.symbol = symbol;
    if (side) where.side = side;

    const [depths, total] = await Promise.all([
      this.prisma.marketDepth.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.marketDepth.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách độ sâu thị trường thành công',
      data: {
        data: depths.map(depth => new MarketDepthResponseDto(depth)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

async getOrderBook(symbol: string, levels: number = 10) {
    const [bidsData, asksData] = await Promise.all([
      // BIDS
      this.prisma.marketDepth.findMany({
        where: { 
          symbol,
          side: MarketDepthSide.BID // Sử dụng enum mới
        },
        orderBy: [
          { price: 'desc' }, // BIDS: giá cao nhất đầu tiên
          { level: 'asc' }
        ],
        take: levels,
      }),
      // ASKS
      this.prisma.marketDepth.findMany({
        where: { 
          symbol,
          side: MarketDepthSide.ASK // Sử dụng enum mới
        },
        orderBy: [
          { price: 'asc' }, // ASKS: giá thấp nhất đầu tiên
          { level: 'asc' }
        ],
        take: levels,
      })
    ]);

    const bids = bidsData.map(d => ({
      price: Number(d.price),
      quantity: d.quantity,
      totalValue: Number(d.price) * d.quantity,
      level: d.level,
    }));

    const asks = asksData.map(d => ({
      price: Number(d.price),
      quantity: d.quantity,
      totalValue: Number(d.price) * d.quantity,
      level: d.level,
    }));

    return {
      success: true,
      message: `Lấy order book cho ${symbol} thành công`,
      data: {
        symbol,
        bids,
        asks,
        timestamp: new Date(),
      },
    };
  }

  async remove(id: number) {
    try {
      await this.prisma.marketDepth.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Xóa dữ liệu độ sâu thành công',
        data: null,
      };
    } catch (error) {
      throw new NotFoundException(`Dữ liệu độ sâu #${id} không tồn tại`);
    }
  }
}