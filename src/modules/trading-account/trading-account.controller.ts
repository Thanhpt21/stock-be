// src/trading-account/trading-account.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { TradingAccountService } from './trading-account.service';
import { CreateTradingAccountDto } from './dto/create-trading-account.dto';
import { UpdateTradingAccountDto } from './dto/update-trading-account.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('trading-account')
@UseGuards(JwtAuthGuard)
export class TradingAccountController {
  constructor(private service: TradingAccountService) {}

    @Post()
    create(@Body() dto: CreateTradingAccountDto, @Req() req: any) {
    const userId = req.user.id;
    return this.service.create(dto, userId);
    }

  @Get('user/:userId')
  findAll(@Param('userId') userId: string) {
    return this.service.findAll(+userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTradingAccountDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
