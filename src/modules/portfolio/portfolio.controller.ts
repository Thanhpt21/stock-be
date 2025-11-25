import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { AddPortfolioItemDto } from './dto/add-portfolio-item.dto';
import { UpdatePortfolioItemDto } from './dto/update-portfolio-item.dto';

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  async getUserPortfolios(@Request() req) {
    return this.portfolioService.getUserPortfolios(req.user.id);
  }

  @Post()
  async createPortfolio(@Request() req, @Body() dto: CreatePortfolioDto) {
    return this.portfolioService.createPortfolio(req.user.id, dto);
  }

  @Put(':id')
  async updatePortfolio(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioDto,
  ) {
    return this.portfolioService.updatePortfolio(req.user.id, Number(id), dto);
  }

  @Delete(':id')
  async deletePortfolio(@Request() req, @Param('id') id: string) {
    return this.portfolioService.deletePortfolio(req.user.id, Number(id));
  }

  // ========== ITEMS ==========

  @Post(':id/items')
  async addItem(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AddPortfolioItemDto,
  ) {
    return this.portfolioService.addItem(req.user.id, Number(id), dto);
  }

  @Put(':id/items/:itemId')
  async updateItem(
    @Request() req,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePortfolioItemDto,
  ) {
    return this.portfolioService.updateItem(
      req.user.id,
      Number(id),
      Number(itemId),
      dto,
    );
  }

  @Delete(':id/items/:itemId')
  async deleteItem(
    @Request() req,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.portfolioService.deleteItem(
      req.user.id,
      Number(id),
      Number(itemId),
    );
  }
}
