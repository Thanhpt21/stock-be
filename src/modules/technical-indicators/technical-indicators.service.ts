// src/technical-indicators/technical-indicators.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateTechnicalIndicatorDto } from './dto/create-technical-indicator.dto';
import { UpdateTechnicalIndicatorDto } from './dto/update-technical-indicator.dto';
import { TechnicalIndicatorQueryDto } from './dto/technical-indicator-query.dto';
import { TechnicalIndicatorResponseDto } from './dto/technical-indicator-response.dto';

@Injectable()
export class TechnicalIndicatorsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateTechnicalIndicatorDto) {
    try {
      const indicator = await this.prisma.technicalIndicator.create({
        data: createDto,
      });

      return {
        success: true,
        message: 'Tạo chỉ báo kỹ thuật thành công',
        data: new TechnicalIndicatorResponseDto(indicator),
      };
    } catch (error) {
      throw new BadRequestException('Không thể tạo chỉ báo kỹ thuật');
    }
  }

  async findAll(query: TechnicalIndicatorQueryDto) {
    const {
      symbol,
      indicator,
      timeframe,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (symbol) where.symbol = symbol;
    if (indicator) where.indicator = indicator;
    if (timeframe) where.timeframe = timeframe;

    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = fromDate;
      if (toDate) where.date.lte = toDate;
    }

    const [indicators, total] = await Promise.all([
      this.prisma.technicalIndicator.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.technicalIndicator.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách chỉ báo kỹ thuật thành công',
      data: {
        data: indicators.map(ind => new TechnicalIndicatorResponseDto(ind)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async findOne(id: number) {
    const indicator = await this.prisma.technicalIndicator.findUnique({
      where: { id },
    });

    if (!indicator) {
      throw new NotFoundException(`Chỉ báo kỹ thuật #${id} không tồn tại`);
    }

    return {
      success: true,
      message: 'Lấy chỉ báo kỹ thuật thành công',
      data: new TechnicalIndicatorResponseDto(indicator),
    };
  }

  async update(id: number, updateDto: UpdateTechnicalIndicatorDto) {
    try {
      const indicator = await this.prisma.technicalIndicator.update({
        where: { id },
        data: updateDto,
      });

      return {
        success: true,
        message: 'Cập nhật chỉ báo kỹ thuật thành công',
        data: new TechnicalIndicatorResponseDto(indicator),
      };
    } catch (error) {
      throw new NotFoundException(`Chỉ báo kỹ thuật #${id} không tồn tại`);
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.technicalIndicator.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Xóa chỉ báo kỹ thuật thành công',
        data: null,
      };
    } catch (error) {
      throw new NotFoundException(`Chỉ báo kỹ thuật #${id} không tồn tại`);
    }
  }

  async getBySymbol(symbol: string) {
    const indicators = await this.prisma.technicalIndicator.findMany({
      where: { symbol },
      orderBy: { date: 'desc' },
      take: 50,
    });

    return {
      success: true,
      message: `Lấy chỉ báo kỹ thuật cho ${symbol} thành công`,
      data: indicators.map(ind => new TechnicalIndicatorResponseDto(ind)),
    };
  }

  async getLatestIndicators(symbol: string, timeframe: string = '1d') {
    const indicators = await this.prisma.technicalIndicator.findMany({
      where: { 
        symbol, 
        timeframe,
        date: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      },
      orderBy: { date: 'desc' },
    });

    // Group by indicator type
    const grouped = indicators.reduce((acc, ind) => {
      if (!acc[ind.indicator]) {
        acc[ind.indicator] = [];
      }
      acc[ind.indicator].push(new TechnicalIndicatorResponseDto(ind));
      return acc;
    }, {});

    return {
      success: true,
      message: `Lấy chỉ báo mới nhất cho ${symbol} thành công`,
      data: grouped,
    };
  }
}