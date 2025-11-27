// src/position/position.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { PositionResponseDto } from './dto/position-response.dto';

@Injectable()
export class PositionService {
  constructor(private prisma: PrismaService) {}

  /**
   * LẤY DANH SÁCH VỊ THẾ THEO TÀI KHOẢN
   */
  async getPositionsByAccount(accountId: number) {
    // Kiểm tra tài khoản tồn tại
    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      throw new NotFoundException(`Tài khoản giao dịch #${accountId} không tồn tại`);
    }

    // Lấy danh sách vị thế
    const positions = await this.prisma.position.findMany({
      where: { accountId },
      orderBy: { lastUpdated: 'desc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách vị thế thành công',
      data: positions.map(position => new PositionResponseDto(position)),
    };
  }

  /**
   * LẤY CHI TIẾT VỊ THẾ
   */
  async getPosition(positionId: number) {
    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
      include: {
        account: true
      }
    });

    if (!position) {
      throw new NotFoundException(`Vị thế #${positionId} không tồn tại`);
    }

    return {
      success: true,
      message: 'Lấy thông tin vị thế thành công',
      data: new PositionResponseDto(position),
    };
  }

  /**
   * CẬP NHẬT VỊ THÉ KHI CÓ LỆNH KHỚP
   * Được gọi từ OrderService khi order được execute
   */
  async updatePositionFromOrder(order: any, executedQuantity: number, executionPrice: number) {
    const { accountId, symbol, side } = order;

    // Tìm vị thế hiện tại
    const existingPosition = await this.prisma.position.findUnique({
      where: {
        accountId_symbol: {
          accountId,
          symbol
        }
      }
    });

    if (side === 'BUY') {
      return await this.handleBuyOrder(existingPosition, accountId, symbol, executedQuantity, executionPrice);
    } else {
      return await this.handleSellOrder(existingPosition, accountId, symbol, executedQuantity, executionPrice);
    }
  }

  /**
   * XỬ LÝ LỆNH MUA - CẬP NHẬT HOẶC TẠO VỊ THẾ MỚI
   */
  private async handleBuyOrder(
    existingPosition: any,
    accountId: number,
    symbol: string,
    quantity: number,
    price: number
  ) {
    const totalCost = quantity * price;

    if (existingPosition) {
      // Cập nhật vị thế hiện tại
      const newQuantity = existingPosition.quantity + quantity;
      const newAveragePrice = this.calculateAveragePrice(
        existingPosition.quantity,
        Number(existingPosition.averagePrice),
        quantity,
        price
      );

      const updatedPosition = await this.prisma.position.update({
        where: { id: existingPosition.id },
        data: {
          quantity: newQuantity,
          averagePrice: newAveragePrice,
          lastUpdated: new Date()
        }
      });

      return updatedPosition;
    } else {
      // Tạo vị thế mới
      const newPosition = await this.prisma.position.create({
        data: {
          accountId,
          symbol,
          quantity,
          averagePrice: price,
          unrealizedPL: 0,
          realizedPL: 0,
          lastUpdated: new Date()
        }
      });

      return newPosition;
    }
  }

  /**
   * XỬ LÝ LỆNH BÁN - GIẢM SỐ LƯỢNG VỊ THẾ
   */
  private async handleSellOrder(
    existingPosition: any,
    accountId: number,
    symbol: string,
    quantity: number,
    price: number
  ) {
    if (!existingPosition) {
      throw new Error(`Không có vị thế để bán cho mã ${symbol}`);
    }

    if (existingPosition.quantity < quantity) {
      throw new Error(`Số lượng vị thế không đủ để bán. Hiện có: ${existingPosition.quantity}, yêu cầu: ${quantity}`);
    }

    const newQuantity = existingPosition.quantity - quantity;
    
    // Tính realized P&L
    const costBasis = Number(existingPosition.averagePrice) * quantity;
    const saleValue = quantity * price;
    const realizedPL = saleValue - costBasis;

    if (newQuantity === 0) {
      // ✅ SỬA: KHÔNG xóa position, mà set quantity = 0
      const updatedPosition = await this.prisma.position.update({
        where: { id: existingPosition.id },
        data: {
          quantity: 0, // Set về 0 thay vì xóa
          realizedPL: { increment: realizedPL },
          lastUpdated: new Date()
        }
      });

      // Cập nhật realized PL vào account
      await this.updateRealizedPL(accountId, realizedPL);

      return updatedPosition; // ✅ Trả về position thay vì null
    } else {
      // Cập nhật vị thế còn lại
      const updatedPosition = await this.prisma.position.update({
        where: { id: existingPosition.id },
        data: {
          quantity: newQuantity,
          realizedPL: { increment: realizedPL },
          lastUpdated: new Date()
        }
      });

      // Cập nhật realized PL vào account
      await this.updateRealizedPL(accountId, realizedPL);

      return updatedPosition;
    }
  }
  /**
   * TÍNH GIÁ TRUNG BÌNH MỚI KHI MUA THÊM
   */
  private calculateAveragePrice(
    currentQuantity: number,
    currentAveragePrice: number,
    newQuantity: number,
    newPrice: number
  ): number {
    const totalCost = (currentQuantity * currentAveragePrice) + (newQuantity * newPrice);
    const totalQuantity = currentQuantity + newQuantity;
    return totalCost / totalQuantity;
  }

  /**
   * CẬP NHẬT REALIZED P&L VÀO TÀI KHOẢN
   */
  private async updateRealizedPL(accountId: number, realizedPL: number) {
    // Có thể cập nhật vào tài khoản hoặc lưu vào bảng riêng
    // Ở đây ta sẽ cập nhật trực tiếp vào trading account
    await this.prisma.tradingAccount.update({
      where: { id: accountId },
      data: {
        balance: { increment: realizedPL },
        availableCash: { increment: realizedPL }
      }
    });
  }

  /**
   * TÍNH TOÁN UNREALIZED P&L CHO TẤT CẢ VỊ THẾ
   * Dựa trên giá thị trường hiện tại
   */
  async calculateUnrealizedPL(accountId: number, currentPrices: { [symbol: string]: number }) {
    const positions = await this.prisma.position.findMany({
      where: { accountId }
    });

    for (const position of positions) {
      const currentPrice = currentPrices[position.symbol];
      if (currentPrice) {
        const unrealizedPL = (currentPrice - Number(position.averagePrice)) * position.quantity;
        
        await this.prisma.position.update({
          where: { id: position.id },
          data: {
            currentPrice,
            unrealizedPL
          }
        });
      }
    }

    return {
      success: true,
      message: 'Cập nhật Unrealized P&L thành công'
    };
  }

  /**
   * XÓA VỊ THẾ (chỉ cho admin)
   */
  async deletePosition(positionId: number) {
    const position = await this.prisma.position.findUnique({
      where: { id: positionId }
    });

    if (!position) {
      throw new NotFoundException(`Vị thế #${positionId} không tồn tại`);
    }

    await this.prisma.position.delete({
      where: { id: positionId }
    });

    return {
      success: true,
      message: 'Xóa vị thế thành công',
      data: null
    };
  }
}