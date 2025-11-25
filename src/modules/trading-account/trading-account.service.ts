import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTradingAccountDto } from './dto/create-trading-account.dto';
import { UpdateTradingAccountDto } from './dto/update-trading-account.dto';
import { TradingAccountResponseDto } from './dto/trading-account-response.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class TradingAccountService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTradingAccountDto, userId: number) {
    const accountNumber = `ACCT-${Date.now()}`;
    const account = await this.prisma.tradingAccount.create({
      data: {
        ...dto,
        accountNumber,
        userId,
      },
    });

    return {
      success: true,
      message: 'Tạo tài khoản giao dịch thành công',
      data: new TradingAccountResponseDto(account),
    };
  }

  async findAll(userId: number) {
    const accounts = await this.prisma.tradingAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Danh sách tài khoản giao dịch lấy thành công',
      data: accounts.map(a => new TradingAccountResponseDto(a)),
    };
  }

  async findOne(id: number) {
    const account = await this.prisma.tradingAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException(`Tài khoản giao dịch #${id} không tồn tại`);

    return {
      success: true,
      message: 'Lấy thông tin tài khoản giao dịch thành công',
      data: new TradingAccountResponseDto(account),
    };
  }

  async update(id: number, dto: UpdateTradingAccountDto) {
    const account = await this.prisma.tradingAccount.update({
      where: { id },
      data: dto,
    });

    return {
      success: true,
      message: 'Cập nhật tài khoản giao dịch thành công',
      data: new TradingAccountResponseDto(account),
    };
  }

  async remove(id: number) {
    const account = await this.prisma.tradingAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException(`Tài khoản giao dịch #${id} không tồn tại`);

    await this.prisma.tradingAccount.delete({ where: { id } });

    return {
      success: true,
      message: 'Xóa tài khoản giao dịch thành công',
      data: null,
    };
  }
}
