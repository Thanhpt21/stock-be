// src/order/order.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrderType, OrderSide, OrderStatus } from '@prisma/client';
import { OrderStatsResponseDto } from './dto/order-stats-response.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PositionService } from '../position/position.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService,
    private positionService: PositionService
  ) {}

  /**
   * TẠO LỆNH MỚI
   * - Kiểm tra tài khoản giao dịch
   * - Validate điều kiện đặt lệnh
   * - Tạo lệnh trong database
   * - Xử lý matching tự động
   */
async createOrder(dto: CreateOrderDto) {
  // Kiểm tra tài khoản giao dịch có tồn tại và đang hoạt động không
  const account = await this.prisma.tradingAccount.findUnique({
    where: { 
      id: dto.accountId,
      status: 'ACTIVE'
    }
  });
  
  if (!account) {
    throw new NotFoundException(`Không tìm thấy tài khoản giao dịch hoặc tài khoản đã bị khóa`);
  }

  // Validate các điều kiện đặt lệnh - TRUYỀN currentPrice
  await this.validateOrder(dto, account);

  // Lưu lệnh vào database
  const order = await this.prisma.order.create({
    data: {
      accountId: dto.accountId,
      symbol: dto.symbol,
      orderType: dto.orderType,
      side: dto.side,
      quantity: dto.quantity,
      price: dto.price,
      stopPrice: dto.stopPrice,
      status: OrderStatus.PENDING,
      notes: dto.notes,
    },
    include: {
      executions: true
    }
  });

  // ✅ TRUYỀN currentPrice từ client xuống processOrder
  await this.processOrder(order.id, dto.currentPrice);

  return {
    success: true,
    message: 'Đặt lệnh thành công',
    data: new OrderResponseDto(order),
  };
}


private async updateAccountAndPosition(orderId: number, quantity: number, price: number, fees: number) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { account: true }
  });

  if (!order) return;

  const tradeValue = quantity * price;
  
  if (order.side === OrderSide.BUY) {
    // Deduct cash for buy order
    const totalCost = tradeValue + fees;
    await this.prisma.tradingAccount.update({
      where: { id: order.accountId },
      data: {
        balance: { decrement: totalCost },
        availableCash: { decrement: totalCost },
      },
    });
  } else {
    // Add cash for sell order (minus fees)
    const netProceeds = tradeValue - fees;
    await this.prisma.tradingAccount.update({
      where: { id: order.accountId },
      data: {
        balance: { increment: netProceeds },
        availableCash: { increment: netProceeds },
      },
    });
  }

  // ✅ ĐẢM BẢO: Gọi position service để cập nhật position
  try {
    await this.positionService.updatePositionFromOrder(order, quantity, price);
  } catch (error) {
    console.error('Error updating position:', error);
    // Không throw error ở đây để không ảnh hưởng đến order execution
  }
}

  /**
   * VALIDATE LỆNH TRƯỚC KHI ĐẶT
   * - Kiểm tra giá với lệnh LIMIT
   * - Kiểm tra số dư khả dụng với lệnh BUY
   * - Kiểm tra số lượng cổ phiếu với lệnh SELL
   */
private async validateOrder(dto: CreateOrderDto, account: any) {
  // Với lệnh LIMIT và STOP_LIMIT: bắt buộc phải có giá
  if ((dto.orderType === OrderType.LIMIT || dto.orderType === OrderType.STOP_LIMIT) && !dto.price) {
    throw new BadRequestException('Lệnh giới hạn yêu cầu phải có giá đặt');
  }

  // Với lệnh STOP và STOP_LIMIT: bắt buộc phải có giá kích hoạt
  if ((dto.orderType === OrderType.STOP || dto.orderType === OrderType.STOP_LIMIT) && !dto.stopPrice) {
    throw new BadRequestException('Lệnh dừng yêu cầu phải có giá kích hoạt');
  }

  // Kiểm tra số dư khả dụng cho lệnh MUA
  if (dto.side === OrderSide.BUY) {
    // ✅ SỬA: Dùng currentPrice từ client thay vì gọi getCurrentPrice()
    const estimatedCost = dto.orderType === OrderType.MARKET 
      ? dto.quantity * dto.currentPrice // ✅ Dùng currentPrice từ client
      : dto.quantity * dto.price!; // Giá đặt của lệnh LIMIT

    // So sánh với số dư khả dụng trong tài khoản
    if (Number(account.availableCash) < estimatedCost) {
      throw new BadRequestException(`Số dư khả dụng không đủ để thực hiện lệnh. Cần: ${this.formatMoney(estimatedCost)}, có: ${this.formatMoney(Number(account.availableCash))}`);
    }
  }

  // Kiểm tra số lượng cổ phiếu khả dụng cho lệnh BÁN
  if (dto.side === OrderSide.SELL) {
    // Tìm vị thế (position) hiện tại của mã chứng khoán này
    const position = await this.prisma.position.findUnique({
      where: {
        accountId_symbol: {
          accountId: dto.accountId,
          symbol: dto.symbol
        }
      }
    });

    // Nếu không có vị thế hoặc số lượng không đủ để bán
    if (!position || position.quantity < dto.quantity) {
      throw new BadRequestException(`Số lượng cổ phiếu không đủ để thực hiện lệnh bán. Có: ${position?.quantity || 0}, cần: ${dto.quantity}`);
    }
  }

  // ✅ THÊM: Validate currentPrice
  if (!dto.currentPrice || dto.currentPrice <= 0) {
    throw new BadRequestException('Giá hiện tại không hợp lệ');
  }
}

// Thêm hàm formatMoney để debug
private formatMoney(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount));
}


  /**
   * XỬ LÝ LỆNH - PHÂN LOẠI THEO TYPE
   * - MARKET: khớp ngay lập tức
   * - LIMIT: chờ đạt giá
   * - STOP: chờ kích hoạt rồi thành MARKET
   * - STOP_LIMIT: chờ kích hoạt rồi thành LIMIT
   */
private async processOrder(orderId: number, currentPrice: number) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { account: true }
  });

  if (!order || order.status !== OrderStatus.PENDING) return;

  // ✅ TRUYỀN currentPrice xuống các hàm xử lý
  switch (order.orderType) {
    case OrderType.MARKET:
      await this.executeMarketOrder(order, currentPrice);
      break;
    case OrderType.LIMIT:
      await this.executeLimitOrder(order, currentPrice);
      break;
    case OrderType.STOP:
      await this.executeStopOrder(order, currentPrice);
      break;
    case OrderType.STOP_LIMIT:
      await this.executeStopLimitOrder(order, currentPrice);
      break;
  }
}

  /**
   * XỬ LÝ LỆNH MARKET - KHỚP NGAY LẬP TỨC
   * Lấy giá thị trường hiện tại và khớp toàn bộ số lượng
   */
private async executeMarketOrder(order: any, currentPrice: number) {
  // ✅ DÙNG currentPrice từ client thay vì gọi getCurrentPrice()
  await this.createExecution(order.id, order.quantity, currentPrice);
}


  /**
   * XỬ LÝ LỆNH LIMIT - CHỜ ĐẠT GIÁ
   * - MUA: khớp khi giá thị trường <= giá đặt
   * - BÁN: khớp khi giá thị trường >= giá đặt
   */
private async executeLimitOrder(order: any, currentPrice: number) {
  // ✅ DÙNG currentPrice từ client
  if ((order.side === OrderSide.BUY && currentPrice <= order.price!) ||
      (order.side === OrderSide.SELL && currentPrice >= order.price!)) {
    await this.createExecution(order.id, order.quantity, currentPrice);
  }
}

  /**
   * XỬ LÝ LỆNH STOP - KHI ĐẠT GIÁ KÍCH HOẠT THÌ THÀNH MARKET
   * - MUA: kích hoạt khi giá thị trường >= giá dừng
   * - BÁN: kích hoạt khi giá thị trường <= giá dừng
   */
private async executeStopOrder(order: any, currentPrice: number) {
  // ✅ DÙNG currentPrice từ client
  if ((order.side === OrderSide.BUY && currentPrice >= order.stopPrice!) ||
      (order.side === OrderSide.SELL && currentPrice <= order.stopPrice!)) {
    await this.createExecution(order.id, order.quantity, currentPrice);
  }
}

  /**
   * XỬ LÝ LỆNH STOP LIMIT - KẾT HỢP STOP VÀ LIMIT
   * Bước 1: Chờ đạt giá kích hoạt (như STOP)
   * Bước 2: Sau khi kích hoạt, trở thành lệnh LIMIT
   */
private async executeStopLimitOrder(order: any, currentPrice: number) {
  // ✅ DÙNG currentPrice từ client
  if ((order.side === OrderSide.BUY && currentPrice >= order.stopPrice!) ||
      (order.side === OrderSide.SELL && currentPrice <= order.stopPrice!)) {
    if ((order.side === OrderSide.BUY && currentPrice <= order.price!) ||
        (order.side === OrderSide.SELL && currentPrice >= order.price!)) {
      await this.createExecution(order.id, order.quantity, currentPrice);
    }
  }
}

  /**
   * TẠO BẢN GHI KHỚP LỆNH (EXECUTION)
   * - Lưu thông tin khớp lệnh
   * - Cập nhật trạng thái lệnh
   * - Tính phí giao dịch
   */
    private async createExecution(orderId: number, quantity: number, price: number) {
    // Lấy thông tin order để lấy symbol
    const order = await this.prisma.order.findUnique({
        where: { id: orderId }
    });

    if (!order) return;

    // Tính phí giao dịch
    const commission = this.calculateCommission(quantity, price);
    const tax = this.calculateTax(quantity, price);

    // Tạo bản ghi khớp lệnh - KHÔNG dùng executionId
    const execution = await this.prisma.execution.create({
        data: {
        orderId,
        symbol: order.symbol, // Lấy symbol từ order
        quantity,
        price,
        commission,
        tax,
        exchange: 'HOSE', // Sàn giao dịch mặc định
        // KHÔNG có executionId ở đây
        // executionTime sẽ tự động được set thành now() theo schema
        },
    });

    // Cập nhật trạng thái lệnh: đã khớp hoàn toàn
    await this.prisma.order.update({
        where: { id: orderId },
        data: {
        filledQuantity: quantity, // Số lượng đã khớp
        averagePrice: price, // Giá khớp trung bình
        status: OrderStatus.FILLED, // Trạng thái: đã khớp
        },
    });

    // Cập nhật số dư tài khoản và vị thế
    await this.updateAccountAndPosition(orderId, quantity, price, commission + tax);
    }

  /**
   * TÍNH PHÍ GIAO DỊCH (HOa HỒNG)
   * Công thức: 0.15% giá trị giao dịch
   */
  private calculateCommission(quantity: number, price: number): number {
    const tradeValue = quantity * price; // Giá trị giao dịch
    return tradeValue * 0.0015; // 0.15%
  }

  /**
   * TÍNH THUẾ GTGT
   * Công thức: 0.1% giá trị giao dịch
   */
  private calculateTax(quantity: number, price: number): number {
    const tradeValue = quantity * price; // Giá trị giao dịch
    return tradeValue * 0.001; // 0.1%
  }



  /**
   * CẬP NHẬT VỊ THẾ (POSITION)
   * TODO: Implement chi tiết ở bước 6
   */
  private async updatePosition(order: any, quantity: number, price: number) {
    console.log(`Cập nhật vị thế cho mã ${order.symbol}`);
    // Sẽ được implement đầy đủ trong Position Service
  }

  // ==================== CÁC PHƯƠNG THỨC QUẢN LÝ LỆNH ====================

  /**
   * LẤY DANH SÁCH LỆNH THEO TÀI KHOẢN
   */
  async getOrders(accountId: number) {
    const orders = await this.prisma.order.findMany({
      where: { accountId },
      include: { executions: true }, // Bao gồm thông tin khớp lệnh
      orderBy: { orderDate: 'desc' }, // Sắp xếp mới nhất trước
    });

    return {
      success: true,
      message: 'Lấy danh sách lệnh thành công',
      data: orders.map(order => new OrderResponseDto(order)),
    };
  }

  /**
   * LẤY CHI TIẾT MỘT LỆNH
   */
  async getOrder(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        executions: true, // Thông tin khớp lệnh
        account: true     // Thông tin tài khoản
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy lệnh #${orderId}`);
    }

    return {
      success: true,
      message: 'Lấy thông tin lệnh thành công',
      data: new OrderResponseDto(order),
    };
  }

  /**
   * HỦY LỆNH ĐANG CHỜ
   * Chỉ hủy được lệnh ở trạng thái PENDING
   */
  async cancelOrder(orderId: number) {
    // Tìm lệnh đang ở trạng thái chờ khớp
    const order = await this.prisma.order.findUnique({
      where: { 
        id: orderId,
        status: OrderStatus.PENDING // Chỉ cho hủy lệnh chưa khớp
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy lệnh đang chờ #${orderId} hoặc lệnh đã được khớp`);
    }

    // Cập nhật trạng thái thành ĐÃ HỦY
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });

    return {
      success: true,
      message: 'Hủy lệnh thành công',
      data: new OrderResponseDto(updatedOrder),
    };
  }

async updateOrder(orderId: number, dto: UpdateOrderDto) {
  // Tìm lệnh đang ở trạng thái chờ khớp
  const order = await this.prisma.order.findUnique({
    where: { 
      id: orderId,
      status: OrderStatus.PENDING // Chỉ cho cập nhật lệnh chưa khớp
    },
    include: { account: true }
  });

  if (!order) {
    throw new NotFoundException(`Không tìm thấy lệnh đang chờ #${orderId} hoặc lệnh đã được khớp`);
  }

  // Validate số dư nếu là lệnh BUY và thay đổi số lượng/giá
  if (dto.quantity && order.side === OrderSide.BUY) {
    const newQuantity = dto.quantity;
    const price = dto.price || order.price;
    
    if (price) {
      const estimatedCost = newQuantity * Number(price);
      if (Number(order.account.availableCash) < estimatedCost) {
        throw new BadRequestException('Số dư khả dụng không đủ sau khi cập nhật');
      }
    }
  }

  // Validate số lượng cổ phiếu nếu là lệnh SELL và thay đổi số lượng
  if (dto.quantity && order.side === OrderSide.SELL) {
    const position = await this.prisma.position.findUnique({
      where: {
        accountId_symbol: {
          accountId: order.accountId,
          symbol: order.symbol
        }
      }
    });

    if (!position || position.quantity < dto.quantity) {
      throw new BadRequestException('Số lượng cổ phiếu không đủ sau khi cập nhật');
    }
  }

  // Cập nhật lệnh - KHÔNG cần set updatedAt
  const updatedOrder = await this.prisma.order.update({
    where: { id: orderId },
    data: {
      quantity: dto.quantity,
      price: dto.price,
      stopPrice: dto.stopPrice,
      notes: dto.notes,
      // KHÔNG có updatedAt ở đây - Prisma tự động xử lý
    },
    include: {
      executions: true
    }
  });

  return {
    success: true,
    message: 'Cập nhật lệnh thành công',
    data: new OrderResponseDto(updatedOrder),
  };
}

/**
 * LẤY LỆNH THEO TRẠNG THÁI
 */
async getOrdersByStatus(accountId: number, status: OrderStatus) {
  const orders = await this.prisma.order.findMany({
    where: { 
      accountId,
      status 
    },
    include: { 
      executions: true 
    },
    orderBy: { orderDate: 'desc' },
  });

  return {
    success: true,
    message: `Lấy danh sách lệnh ${status.toLowerCase()} thành công`,
    data: orders.map(order => new OrderResponseDto(order)),
  };
}

/**
 * LẤY LỆNH THEO KHOẢNG THỜI GIAN
 */
async getOrdersByDateRange(accountId: number, startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Set đến cuối ngày

  const orders = await this.prisma.order.findMany({
    where: { 
      accountId,
      orderDate: {
        gte: start,
        lte: end
      }
    },
    include: { 
      executions: true 
    },
    orderBy: { orderDate: 'desc' },
  });

  return {
    success: true,
    message: `Lấy danh sách lệnh từ ${startDate} đến ${endDate} thành công`,
    data: orders.map(order => new OrderResponseDto(order)),
  };
}

/**
 * LẤY THỐNG KÊ LỆNH
 */
async getOrderStats(accountId: number) {
  // Lấy tất cả lệnh của tài khoản
  const orders = await this.prisma.order.findMany({
    where: { accountId },
    include: { executions: true }
  });

  // Tính toán thống kê
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING).length;
  const filledOrders = orders.filter(o => o.status === OrderStatus.FILLED).length;
  const cancelledOrders = orders.filter(o => o.status === OrderStatus.CANCELLED).length;
  const totalBuyOrders = orders.filter(o => o.side === OrderSide.BUY).length;
  const totalSellOrders = orders.filter(o => o.side === OrderSide.SELL).length;
  
  // Tính tỷ lệ thành công (lệnh FILLED / tổng lệnh đã kết thúc)
  const completedOrders = orders.filter(o => 
    o.status === OrderStatus.FILLED || o.status === OrderStatus.CANCELLED
  ).length;
  const successRate = completedOrders > 0 ? (filledOrders / completedOrders) * 100 : 0;

  // Tính tổng khối lượng và giá trị
  const totalVolume = orders.reduce((sum, order) => sum + order.quantity, 0);
  const totalValue = orders.reduce((sum, order) => {
    if (order.averagePrice) {
      return sum + (order.quantity * Number(order.averagePrice));
    }
    return sum;
  }, 0);

  const stats = {
    totalOrders,
    pendingOrders,
    filledOrders,
    cancelledOrders,
    totalBuyOrders,
    totalSellOrders,
    successRate: Math.round(successRate * 100) / 100, // Làm tròn 2 chữ số
    totalVolume,
    totalValue: Math.round(totalValue),
  };

  return {
    success: true,
    message: 'Lấy thống kê lệnh thành công',
    data: new OrderStatsResponseDto(stats),
  };
}

/**
 * LẤY LỆNH THEO MÃ CHỨNG KHOÁN
 */
async getOrdersBySymbol(accountId: number, symbol: string) {
  const orders = await this.prisma.order.findMany({
    where: { 
      accountId,
      symbol: {
        equals: symbol,
        mode: 'insensitive' // Không phân biệt hoa thường
      }
    },
    include: { 
      executions: true 
    },
    orderBy: { orderDate: 'desc' },
  });

  return {
    success: true,
    message: `Lấy danh sách lệnh cho mã ${symbol} thành công`,
    data: orders.map(order => new OrderResponseDto(order)),
  };
}
}