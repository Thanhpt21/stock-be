// src/portfolio-snapshot/portfolio-snapshot.controller.ts
import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { PortfolioSnapshotService } from './portfolio-snapshot.service';
import { CreatePortfolioSnapshotDto } from './dto/create-portfolio-snapshot.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('portfolio-snapshot')
@UseGuards(JwtAuthGuard)
export class PortfolioSnapshotController {
  constructor(private readonly service: PortfolioSnapshotService) {}

  @Post()
  create(@Body() dto: CreatePortfolioSnapshotDto) {
    return this.service.create(dto);
  }

  // Lấy tất cả snapshot của portfolio
  @Get('portfolio/:portfolioId')
  findAll(@Param('portfolioId') portfolioId: string) {
    return this.service.findAll(+portfolioId);
  }

  // Lấy 1 snapshot theo id
  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}