// src/portfolio-snapshot/portfolio-snapshot.module.ts
import { Module } from '@nestjs/common';
import { PortfolioSnapshotService } from './portfolio-snapshot.service';
import { PortfolioSnapshotController } from './portfolio-snapshot.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PortfolioSnapshotCronService } from './portfolio-snapshot-cron.service';

@Module({
  imports: [PrismaModule],
  controllers: [PortfolioSnapshotController],
  providers: [PortfolioSnapshotService, PortfolioSnapshotCronService],
})
export class PortfolioSnapshotModule {}
