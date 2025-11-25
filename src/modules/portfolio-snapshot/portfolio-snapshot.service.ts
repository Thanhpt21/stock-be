// src/portfolio-snapshot/portfolio-snapshot.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePortfolioSnapshotDto } from './dto/create-portfolio-snapshot.dto';
import { PortfolioSnapshotResponseDto } from './dto/portfolio-snapshot-response.dto';

@Injectable()
export class PortfolioSnapshotService {
  private readonly logger = new Logger(PortfolioSnapshotService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Tạo snapshot mới
  async create(dto: CreatePortfolioSnapshotDto) {
    const { portfolioId, totalValue } = dto;

    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: { items: true },
    });

    if (!portfolio) {
      return { success: false, message: 'Danh mục không tồn tại', data: null };
    }

    // Nếu không có totalValue, tính tự động từ quantity * averagePrice
    const computedValue =
      totalValue ??
      portfolio.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.averagePrice), 0);

    const snapshot = await this.prisma.portfolioSnapshot.create({
      data: {
        portfolioId,
        totalValue: computedValue,
      },
    });

    return { success: true, message: 'Tạo snapshot thành công', data: new PortfolioSnapshotResponseDto(snapshot) };
  }

  // Lấy tất cả snapshot của portfolio
  async findAll(portfolioId: number) {
    const snapshots = await this.prisma.portfolioSnapshot.findMany({
      where: { portfolioId },
      orderBy: { snapshotDate: 'desc' },
    });

    return {
      success: true,
      message: 'Lấy danh sách snapshot thành công',
      data: snapshots.map(s => new PortfolioSnapshotResponseDto(s)),
    };
  }

  // Lấy 1 snapshot theo id
  async findOne(id: number) {
    const snapshot = await this.prisma.portfolioSnapshot.findUnique({
      where: { id },
    });

    if (!snapshot) {
      return { success: false, message: 'Không tìm thấy snapshot', data: null };
    }

    return { success: true, message: 'Lấy snapshot thành công', data: new PortfolioSnapshotResponseDto(snapshot) };
  }

  // Xóa snapshot (tuỳ chọn)
  async remove(id: number) {
    const snapshot = await this.prisma.portfolioSnapshot.findUnique({ where: { id } });
    if (!snapshot) {
      return { success: false, message: 'Không tìm thấy snapshot', data: null };
    }

    await this.prisma.portfolioSnapshot.delete({ where: { id } });
    return { success: true, message: 'Xóa snapshot thành công', data: null };
  }
}
