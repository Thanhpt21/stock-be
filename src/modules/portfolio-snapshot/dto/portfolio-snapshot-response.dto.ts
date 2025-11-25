// src/portfolio-snapshot/dto/portfolio-snapshot-response.dto.ts
import { PortfolioSnapshot } from '@prisma/client';

export class PortfolioSnapshotResponseDto {
  id: number;
  portfolioId: number;
  totalValue: number;
  snapshotDate: Date;
  createdAt: Date;

  constructor(snapshot: PortfolioSnapshot) {
    this.id = snapshot.id;
    this.portfolioId = snapshot.portfolioId;
    this.totalValue = Number(snapshot.totalValue);
    this.snapshotDate = snapshot.snapshotDate;
    this.createdAt = snapshot.createdAt;
  }
}
