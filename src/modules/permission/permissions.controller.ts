import { Controller, Get, Post, Body, Param, Delete, Put, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';


@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.createPermission(dto);
  }

  @Get()
  async getPermissions(@Query('page') page = 1, @Query('limit') limit = 10, @Query('search') search = '') {
    return this.permissionsService.getPermissions(+page, +limit, search);
  }

  @Get('all/list')
  async getAllPermissions(@Query('search') search = '') {
    return this.permissionsService.getAllPermissions(search);
  }

  @Get(':id')
  async getPermissionById(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.getPermissionById(id);
  }

  @Put(':id')
  async updatePermission(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePermissionDto) {
    return this.permissionsService.updatePermission(id, dto);
  }

  @Delete(':id')
  async deletePermission(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.deletePermission(id);
  }
}
