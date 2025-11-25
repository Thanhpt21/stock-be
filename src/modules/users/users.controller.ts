// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../upload/upload.service';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';


@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploadService: UploadService,
  ) {}

  // Tạo user mới
  @Post()

  // @Permissions('create_users')
  @UseInterceptors(FileInterceptor('avatar'))
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.usersService.createUser(createUserDto, file);
  }

  @Get('all/list')
  // @Permissions('read_all_users')
  async getAllUsers(@Query('search') search: string = '') {
    return await this.usersService.getAllUsers(search);
  }

  // Lấy danh sách user, có phân trang và search
  @Get()
  // @Permissions('read_users')
  async getUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ) {
    return await this.usersService.getUsers(+page, +limit, search);
  }

  // Lấy user theo id
  @Get(':id')
  // @Permissions('get_a_users')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.getUserById(id);
  }

  // Cập nhật user
  @Put(':id')
  // @Permissions('update_users')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.usersService.updateUser(id, updateUserDto, file);
  }


  // Xoá user (chỉ admin mới được phép)
  @Delete(':id')
  // @Permissions('delete_users')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.deleteUser(id);
  }
}
