import { Injectable } from '@nestjs/common';

import { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';
import { UpdatePortfolioItemDto } from './dto/update-portfolio-item.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class PortfolioItemService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePortfolioItemDto) {
    const { portfolioId, symbol, quantity, averagePrice } = dto;

    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });
    if (!portfolio) {
      return {
        success: false,
        message: 'Danh mục không tồn tại',
        data: null,
      };
    }

    const existed = await this.prisma.portfolioItem.findUnique({
      where: { portfolioId_symbol: { portfolioId, symbol } },
    });

    if (existed) {
      return {
        success: false,
        message: 'Mã cổ phiếu đã tồn tại trong danh mục',
        data: null,
      };
    }

    const item = await this.prisma.portfolioItem.create({
      data: {
        portfolioId,
        symbol,
        quantity,
        averagePrice,
      },
    });

    return {
      success: true,
      message: 'Thêm cổ phiếu vào danh mục thành công',
      data: item,
    };
  }

  async findAll(portfolioId: number) {
    const items = await this.prisma.portfolioItem.findMany({
      where: { portfolioId },
    });

    return {
      success: true,
      message: 'Lấy danh sách cổ phiếu trong danh mục thành công',
      data: items,
    };
  }

  async findOne(id: number) {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id },
    });

    if (!item) {
      return {
        success: false,
        message: 'Không tìm thấy cổ phiếu trong danh mục',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Lấy thông tin cổ phiếu thành công',
      data: item,
    };
  }

  async update(id: number, dto: UpdatePortfolioItemDto) {
    const existed = await this.prisma.portfolioItem.findUnique({
      where: { id },
    });

    if (!existed) {
      return {
        success: false,
        message: 'Không tìm thấy cổ phiếu trong danh mục',
        data: null,
      };
    }

    const updated = await this.prisma.portfolioItem.update({
      where: { id },
      data: dto,
    });

    return {
      success: true,
      message: 'Cập nhật cổ phiếu thành công',
      data: updated,
    };
  }

  async remove(id: number) {
    const existed = await this.prisma.portfolioItem.findUnique({
      where: { id },
    });

    if (!existed) {
      return {
        success: false,
        message: 'Không tìm thấy cổ phiếu trong danh mục',
        data: null,
      };
    }

    await this.prisma.portfolioItem.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Xóa cổ phiếu khỏi danh mục thành công',
      data: null,
    };
  }
}
