// src/market-depth/market-depth.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { MarketDepthService } from './market-depth.service';
import { CreateMarketDepthDto } from './dto/create-market-depth.dto';
import { MarketDepthQueryDto } from './dto/market-depth-query.dto';

@Controller('market-depth')
export class MarketDepthController {
  constructor(private readonly marketDepthService: MarketDepthService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createMarketDepthDto: CreateMarketDepthDto) {
    return this.marketDepthService.create(createMarketDepthDto);
  }

  @Get()
  findAll(@Query() query: MarketDepthQueryDto) {
    return this.marketDepthService.findAll(query);
  }

  @Get('order-book/:symbol')
  getOrderBook(
    @Param('symbol') symbol: string,
    @Query('levels') levels?: string,
  ) {
    const levelsNum = levels ? parseInt(levels, 10) : 10;
    return this.marketDepthService.getOrderBook(symbol, levelsNum);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.marketDepthService.remove(id);
  }
}