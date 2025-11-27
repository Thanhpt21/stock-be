// src/technical-indicators/technical-indicators.module.ts
import { Module } from '@nestjs/common';
import { TechnicalIndicatorsService } from './technical-indicators.service';
import { TechnicalIndicatorsController } from './technical-indicators.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TechnicalIndicatorsController],
  providers: [TechnicalIndicatorsService],
  exports: [TechnicalIndicatorsService],
})
export class TechnicalIndicatorsModule {}