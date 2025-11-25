// src/portfolio-snapshot/dto/create-portfolio-snapshot.dto.ts
import { IsInt, IsNotEmpty, IsOptional, IsDate } from 'class-validator';

export class CreatePortfolioSnapshotDto {
  @IsInt()
  @IsNotEmpty()
  portfolioId: number;

  @IsOptional()
  totalValue?: number; // Nếu không truyền, service có thể tính tự động
}
