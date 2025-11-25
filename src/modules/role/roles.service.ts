import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  // Tạo role
  async createRole(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (existing) throw new BadRequestException('Role đã tồn tại');

    const role = await this.prisma.role.create({ data: dto });
    return {
      success: true,
      message: 'Tạo role thành công',
      data: new RoleResponseDto(role),
    };
  }

  // Lấy danh sách role (có phân trang + search)
  async getRoles(page = 1, limit = 10, search = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.RoleWhereInput = search
      ? { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } }
      : {};

    const [roles, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách role thành công',
      data: {
        data: roles.map((r) => new RoleResponseDto(r)),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getAllRoles(search = '') {
    const where: Prisma.RoleWhereInput = search
      ? { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } }
      : {};

    const roles = await this.prisma.role.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Lấy tất cả role thành công',
      data: roles.map((r) => new RoleResponseDto(r)),
    };
  }

  // Lấy role theo id
  async getRoleById(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role không tồn tại');
    return {
      success: true,
      message: 'Lấy role thành công',
      data: new RoleResponseDto(role),
    };
  }

  // Cập nhật role
  async updateRole(id: number, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role không tồn tại');

    const updated = await this.prisma.role.update({ where: { id }, data: dto });
    return {
      success: true,
      message: 'Cập nhật role thành công',
      data: new RoleResponseDto(updated),
    };
  }

  // Xóa role
  async deleteRole(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role không tồn tại');

    await this.prisma.role.delete({ where: { id } });
    return {
      success: true,
      message: 'Xóa role thành công',
      data: null,
    };
  }
}