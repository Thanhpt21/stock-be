// src/users/users.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { Prisma } from '@prisma/client';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async createUser(createUserDto: CreateUserDto, file?: Express.Multer.File) {
    const hashedPassword = createUserDto.password
      ? await bcrypt.hash(createUserDto.password, 10)
      : null;

    const role = 'user';

    let avatar: string | null = null;
    if (file) {
      avatar = await this.uploadService.uploadLocalImage(file);
    }

    const userData = {
      ...createUserDto,
      password: hashedPassword,
      role,
      avatar,
      phone: createUserDto.phone || null,        // Đảm bảo phone được truyền
      gender: createUserDto.gender || null,      // Đảm bảo gender được truyền
    };

    const user = await this.prisma.user.create({
      data: userData,
    });

    return {
      success: true,
      message: 'Tạo người dùng thành công',
      data: new UserResponseDto(user),
    };
  }

  async getUsers(page = 1, limit = 10, search = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {};

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,      
          gender: true,     
          avatar: true,
          isActive: true,
          type_account: true,
          role: true, 
          createdAt: true,
          updatedAt: true,
         
          chatConversations: {
            select: { id: true },
            take: 1,
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const usersWithConversation = users.map((user) => {
      const conversationId = user.chatConversations.length > 0 ? user.chatConversations[0].id : null;
      return {
        ...user,
        conversationId,
      };
    });

    return {
      success: true,
      message: 'Lấy danh sách người dùng thành công',
      data: {
        data: usersWithConversation,
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getAllUsers(search = '') {
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {};

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
       select: {
          id: true,
          name: true,
          email: true,
          phone: true,      
          gender: true,     
          avatar: true,
          isActive: true,
          type_account: true,
          role: true, 
          createdAt: true,
          updatedAt: true,
          chatConversations: {
            select: { id: true },
            take: 1,
          },
        },
    });

    return {
      success: true,
      message: 'Lấy tất cả người dùng thành công',
      data: users,
    };
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      success: true,
      message: 'Lấy thông tin người dùng thành công',
      data: new UserResponseDto(user),
    };
  }

  async updateUser(
    id: number,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const data: any = { ...updateUserDto };

    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (file) {
      if (user.avatar) {
        await this.uploadService.deleteLocalImage(user.avatar);
      }
      const imageUrl = await this.uploadService.uploadLocalImage(file);
      data.avatar = imageUrl;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
    });

    return {
      success: true,
      message: 'Cập nhật người dùng thành công',
      data: new UserResponseDto(updatedUser),
    };
  }

  async deleteUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.avatar) {
      await this.uploadService.deleteLocalImage(user.avatar);
    }

    await this.prisma.user.delete({ where: { id } });

    return {
      success: true,
      message: 'Xóa người dùng thành công',
      data: null,
    };
  }
}