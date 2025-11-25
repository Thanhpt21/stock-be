import { Controller, Post, Body, Delete, Param, Get, ParseIntPipe, UseGuards } from '@nestjs/common';
import { UserRoleService } from './user-role.service';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('user-roles')
export class UserRoleController {
  constructor(private readonly service: UserRoleService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async addRole(@Body() dto: CreateUserRoleDto) {
    return this.service.addRole(dto);
  }

  @Delete(':userId/:roleId')
  @UseGuards(JwtAuthGuard)
  async removeRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    return this.service.removeRole(userId, roleId);
  }

  @Get(':userId')
  async getRolesOfUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.getRolesOfUser(userId);
  }
}
