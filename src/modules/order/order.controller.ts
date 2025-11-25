// src/order/order.controller.ts
import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, Query, Put } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { OrderStatus } from '@prisma/client';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(dto);
  }

  @Get('account/:accountId')
  getOrders(@Param('accountId') accountId: string) {
    return this.orderService.getOrders(+accountId);
  }

  @Get(':id')
  getOrder(@Param('id') id: string) {
    return this.orderService.getOrder(+id);
  }

  @Delete(':id/cancel')
  cancelOrder(@Param('id') id: string) {
    return this.orderService.cancelOrder(+id);
  }

   @Put(':id')
  updateOrder(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.orderService.updateOrder(+id, dto);
  }

  @Get('account/:accountId/status/:status')
  getOrdersByStatus(
    @Param('accountId') accountId: string,
    @Param('status') status: OrderStatus
  ) {
    return this.orderService.getOrdersByStatus(+accountId, status);
  }

  @Get('account/:accountId/date-range')
  getOrdersByDateRange(
    @Param('accountId') accountId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.orderService.getOrdersByDateRange(+accountId, startDate, endDate);
  }

  @Get('account/:accountId/stats')
  getOrderStats(@Param('accountId') accountId: string) {
    return this.orderService.getOrderStats(+accountId);
  }

  @Get('account/:accountId/symbol/:symbol')
  getOrdersBySymbol(
    @Param('accountId') accountId: string,
    @Param('symbol') symbol: string
  ) {
    return this.orderService.getOrdersBySymbol(+accountId, symbol);
  }

  
}