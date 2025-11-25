import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { PortfolioItemService } from './portfolio-item.service';
import { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';
import { UpdatePortfolioItemDto } from './dto/update-portfolio-item.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('portfolio-items')
@UseGuards(JwtAuthGuard)
export class PortfolioItemController {
  constructor(private readonly service: PortfolioItemService) {}

  @Post()
  create(@Body() dto: CreatePortfolioItemDto) {
    return this.service.create(dto);
  }

  @Get('portfolio/:portfolioId')
  findAll(@Param('portfolioId') portfolioId: string) {
    return this.service.findAll(Number(portfolioId));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePortfolioItemDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
