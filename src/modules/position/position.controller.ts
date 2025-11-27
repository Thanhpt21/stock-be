// src/position/position.controller.ts
import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { PositionService } from './position.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('positions')
@UseGuards(JwtAuthGuard)
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Get('account/:accountId')
  getPositionsByAccount(@Param('accountId') accountId: string) {
    return this.positionService.getPositionsByAccount(+accountId);
  }

  @Get(':id')
  getPosition(@Param('id') id: string) {
    return this.positionService.getPosition(+id);
  }

  @Delete(':id')
  deletePosition(@Param('id') id: string) {
    return this.positionService.deletePosition(+id);
  }
}
