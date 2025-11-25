import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateRolePermissionDto } from './dto/create-role-permission.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RolePermissionsService {
  constructor(private prisma: PrismaService) {}

  async addPermission(dto: CreateRolePermissionDto) {
    // Kiểm tra role và permission có tồn tại
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role không tồn tại');

    const permission = await this.prisma.permission.findUnique({ where: { id: dto.permissionId } });
    if (!permission) throw new NotFoundException('Permission không tồn tại');

    // Kiểm tra đã có chưa
    const existing = await this.prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId: dto.roleId, permissionId: dto.permissionId } },
    });
    if (existing) throw new BadRequestException('Permission đã được gán cho role');

    const rolePermission = await this.prisma.rolePermission.create({ data: dto });
    
    return {
      success: true,
      message: 'Thêm permission cho role thành công',
      data: rolePermission,
    };
  }

  async removePermission(roleId: number, permissionId: number) {
    const existing = await this.prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
    if (!existing) throw new NotFoundException('Permission chưa được gán cho role');

    await this.prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });

    return {
      success: true,
      message: 'Xóa permission khỏi role thành công',
      data: null,
    };
  }

  async getPermissionsOfRole(roleId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Role không tồn tại');

    return {
      success: true,
      message: 'Lấy danh sách permission của role thành công',
      data: role.rolePermissions.map((rp) => rp.permission),
    };
  }
}