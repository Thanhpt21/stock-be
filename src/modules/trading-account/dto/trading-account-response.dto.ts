// src/trading-account/dto/trading-account-response.dto.ts
import { TradingAccount as PrismaTradingAccount } from '@prisma/client';

export class TradingAccountResponseDto {
  id: number;
  userId: number;
  accountNumber: string;
  accountName: string;
  brokerName: string;
  balance: number;
  availableCash: number;
  status: string;
  createdAt: string;
  updatedAt: string;

  constructor(entity: PrismaTradingAccount) {
    this.id = entity.id;
    this.userId = entity.userId;
    this.accountNumber = entity.accountNumber;
    this.accountName = entity.accountName;
    this.brokerName = entity.brokerName;
    this.balance = Number(entity.balance);
    this.availableCash = Number(entity.availableCash);
    this.status = entity.status;
    this.createdAt = entity.createdAt.toISOString();
    this.updatedAt = entity.updatedAt.toISOString();
  }
}
