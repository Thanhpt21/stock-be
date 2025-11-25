import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { AddPortfolioItemDto } from './dto/add-portfolio-item.dto';
import { UpdatePortfolioItemDto } from './dto/update-portfolio-item.dto';

import { PortfolioResponseDto } from './dto/portfolio-response.dto';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  // ====== PORTFOLIO ======

  async getUserPortfolios(userId: number) {
    const portfolios = await this.prisma.portfolio.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Lấy danh sách portfolio thành công',
      data: portfolios.map((p) => new PortfolioResponseDto(p)),
    };
  }

  async createPortfolio(userId: number, dto: CreatePortfolioDto) {
    const portfolio = await this.prisma.portfolio.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
      },
      include: { items: true },
    });

    return {
      success: true,
      message: 'Tạo portfolio thành công',
      data: new PortfolioResponseDto(portfolio),
    };
  }

  async updatePortfolio(userId: number, id: number, dto: UpdatePortfolioDto) {
    const found = await this.prisma.portfolio.findFirst({
      where: { id, userId },
    });

    if (!found) throw new NotFoundException('Portfolio không tồn tại');

    const updated = await this.prisma.portfolio.update({
      where: { id },
      data: dto,
      include: { items: true },
    });

    return {
      success: true,
      message: 'Cập nhật portfolio thành công',
      data: new PortfolioResponseDto(updated),
    };
  }

  async deletePortfolio(userId: number, id: number) {
    const found = await this.prisma.portfolio.findFirst({
      where: { id, userId },
    });

    if (!found) throw new NotFoundException('Portfolio không tồn tại');

    await this.prisma.portfolio.delete({ where: { id } });

    return {
      success: true,
      message: 'Xóa portfolio thành công',
    };
  }

  // ====== ITEMS ======

  async addItem(userId: number, portfolioId: number, dto: AddPortfolioItemDto) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });

    if (!portfolio) throw new NotFoundException('Portfolio không tồn tại');

    const item = await this.prisma.portfolioItem.create({
      data: {
        portfolioId,
        symbol: dto.symbol,
        quantity: dto.quantity,
        averagePrice: dto.averagePrice,
      },
    });

    const updated = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId },
      include: { items: true },
    });

    return {
      success: true,
      message: 'Thêm mã cổ phiếu vào portfolio thành công',
      data: new PortfolioResponseDto(updated!),
    };
  }

  async updateItem(
    userId: number,
    portfolioId: number,
    itemId: number,
    dto: UpdatePortfolioItemDto,
  ) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });
    if (!portfolio) throw new NotFoundException('Portfolio không tồn tại');

    const item = await this.prisma.portfolioItem.findFirst({
      where: { id: itemId, portfolioId },
    });
    if (!item) throw new NotFoundException('Mã cổ phiếu không tồn tại');

    await this.prisma.portfolioItem.update({
      where: { id: itemId },
      data: dto,
    });

    const updated = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId },
      include: { items: true },
    });

    return {
      success: true,
      message: 'Cập nhật mã cổ phiếu thành công',
      data: new PortfolioResponseDto(updated!),
    };
  }

  async deleteItem(userId: number, portfolioId: number, itemId: number) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, userId },
    });
    if (!portfolio) throw new NotFoundException('Portfolio không tồn tại');

    const item = await this.prisma.portfolioItem.findFirst({
      where: { id: itemId, portfolioId },
    });
    if (!item) throw new NotFoundException('Mã cổ phiếu không tồn tại');

    await this.prisma.portfolioItem.delete({
      where: { id: itemId },
    });

    const updated = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId },
      include: { items: true },
    });

    return {
      success: true,
      message: 'Xóa mã cổ phiếu thành công',
      data: new PortfolioResponseDto(updated!),
    };
  }
}
