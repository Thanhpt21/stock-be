import { Module } from '@nestjs/common';
import { PortfolioItemService } from './portfolio-item.service';
import { PortfolioItemController } from './portfolio-item.controller';
import { PrismaService } from 'prisma/prisma.service';


@Module({
  controllers: [PortfolioItemController],
  providers: [PortfolioItemService, PrismaService],
})
export class PortfolioItemModule {}
