// src/portfolio-snapshot/portfolio-snapshot-cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';
import { PortfolioSnapshotService } from './portfolio-snapshot.service';

@Injectable()
export class PortfolioSnapshotCronService {
  private readonly logger = new Logger(PortfolioSnapshotCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshotService: PortfolioSnapshotService,
  ) {}

  // Chạy cron mỗi ngày lúc 23:59
  @Cron('59 23 * * *')
  async handleCron() {
    this.logger.log('Bắt đầu tạo snapshot cho tất cả portfolio');

    const portfolios = await this.prisma.portfolio.findMany({
      include: { items: true },
    });

    for (const portfolio of portfolios) {
      const totalValue = portfolio.items.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.averagePrice),
        0,
      );

      await this.snapshotService.create({
        portfolioId: portfolio.id,
        totalValue,
      });
    }

    this.logger.log('Hoàn tất tạo snapshot cho tất cả portfolio');
  }
}
