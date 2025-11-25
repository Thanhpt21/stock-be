import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async createPermission(dto: CreatePermissionDto) {
    const existing = await this.prisma.permission.findUnique({ where: { name: dto.name } });
    if (existing) throw new BadRequestException('Permission đã tồn tại');

    const permission = await this.prisma.permission.create({ data: dto });
    return {
      success: true,
      message: 'Tạo permission thành công',
      data: new PermissionResponseDto(permission),
    };
  }

  async getPermissions(page = 1, limit = 10, search = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.PermissionWhereInput = search
      ? { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } }
      : {};

    const [permissions, total] = await this.prisma.$transaction([
      this.prisma.permission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.permission.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách permission thành công',
      data: {
        data: permissions.map((p) => new PermissionResponseDto(p)),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getAllPermissions(search = '') {
    const where: Prisma.PermissionWhereInput = search
      ? { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } }
      : {};

    const permissions = await this.prisma.permission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Lấy tất cả permission thành công',
      data: permissions.map((p) => new PermissionResponseDto(p)),
    };
  }

  async getPermissionById(id: number) {
    const permission = await this.prisma.permission.findUnique({ where: { id } });
    if (!permission) throw new NotFoundException('Permission không tồn tại');
    return {
      success: true,
      message: 'Lấy permission thành công',
      data: new PermissionResponseDto(permission),
    };
  }

  async updatePermission(id: number, dto: UpdatePermissionDto) {
    const permission = await this.prisma.permission.findUnique({ where: { id } });
    if (!permission) throw new NotFoundException('Permission không tồn tại');

    const updated = await this.prisma.permission.update({ where: { id }, data: dto });
    return {
      success: true,
      message: 'Cập nhật permission thành công',
      data: new PermissionResponseDto(updated),
    };
  }

  async deletePermission(id: number) {
    const permission = await this.prisma.permission.findUnique({ where: { id } });
    if (!permission) throw new NotFoundException('Permission không tồn tại');

    await this.prisma.permission.delete({ where: { id } });
    return {
      success: true,
      message: 'Xóa permission thành công',
      data: null,
    };
  }
}