// src/technical-indicators/technical-indicators.controller.ts
import { Controller, Get, Post, Body, Param, Delete, Put, Query, UseGuards } from '@nestjs/common';
import { TechnicalIndicatorsService } from './technical-indicators.service';
import { TechnicalIndicatorQueryDto } from './dto/technical-indicator-query.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateTechnicalIndicatorDto } from './dto/create-technical-indicator.dto';
import { UpdateTechnicalIndicatorDto } from './dto/update-technical-indicator.dto';

@Controller('technical-indicators')
@UseGuards(JwtAuthGuard)
export class TechnicalIndicatorsController {
  constructor(private readonly service: TechnicalIndicatorsService) {}

  @Post()
  create(@Body() createDto: CreateTechnicalIndicatorDto) {
    return this.service.create(createDto);
  }

  @Get()
  findAll(@Query() query: TechnicalIndicatorQueryDto) {
    return this.service.findAll(query);
  }

  @Get('symbol/:symbol')
  getBySymbol(@Param('symbol') symbol: string) {
    return this.service.getBySymbol(symbol);
  }

  @Get('latest/:symbol')
  getLatest(@Param('symbol') symbol: string, @Query('timeframe') timeframe: string) {
    return this.service.getLatestIndicators(symbol, timeframe);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateTechnicalIndicatorDto) {
    return this.service.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}