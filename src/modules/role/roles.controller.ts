import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';



@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // Tạo role mới (admin)
  @Post()
  @UseGuards(JwtAuthGuard)
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  // Lấy danh sách role
  @Get()
  async getRoles(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ) {
    return this.rolesService.getRoles(+page, +limit, search);
  }

  @Get('all/list')
  async getAllRoles(@Query('search') search: string = '') {
    return this.rolesService.getAllRoles(search);
  }

  // Lấy role theo id
  @Get(':id')
  async getRoleById(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.getRoleById(id);
  }

  // Cập nhật role (admin)
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, dto);
  }

  // Xóa role (admin)
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.deleteRole(id);
  }
}
