// user-role.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'prisma/prisma.service'
import { CreateUserRoleDto } from './dto/create-user-role.dto'

@Injectable()
export class UserRoleService {
  constructor(private prisma: PrismaService) {}

  async addRole(dto: CreateUserRoleDto) {
  // Kiểm tra user tồn tại
  const user = await this.prisma.user.findUnique({
    where: { id: dto.userId },
  })
  if (!user) {
    throw new NotFoundException('User không tồn tại')
  }

  // Kiểm tra role tồn tại
  const role = await this.prisma.role.findUnique({
    where: { id: dto.roleId },
  })
  if (!role) {
    throw new NotFoundException('Role không tồn tại')
  }

  // Kiểm tra đã tồn tại user-role chưa
  const existingUserRole = await this.prisma.userRole.findUnique({
    where: {
      userId_roleId: { // Sử dụng composite unique constraint
        userId: dto.userId,
        roleId: dto.roleId,
      },
    },
  })

  if (existingUserRole) {
    throw new ConflictException('User đã có role này')
  }

  // Tạo user-role
  const userRole = await this.prisma.userRole.create({
    data: {
      userId: dto.userId,
      roleId: dto.roleId,
    },
    include: {
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return {
    success: true,
    message: 'Thêm role cho user thành công',
    data: userRole,
  }
}

async removeRole(userId: number, roleId: number) {
  // Kiểm tra user-role tồn tại
  const userRole = await this.prisma.userRole.findUnique({
    where: {
      userId_roleId: { // Sử dụng composite unique constraint
        userId,
        roleId,
      },
    },
  })

  if (!userRole) {
    throw new NotFoundException('User không có role này')
  }

  // Xóa user-role
  await this.prisma.userRole.delete({
    where: {
      userId_roleId: { // Sử dụng composite unique constraint
        userId,
        roleId,
      },
    },
  })

  return {
    success: true,
    message: 'Xóa role khỏi user thành công',
    data: null,
  }
}

async getRolesOfUser(userId: number) {
  // Kiểm tra user tồn tại
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  })
  if (!user) {
    throw new NotFoundException('User không tồn tại')
  }

  // Lấy danh sách roles của user
  const userRoles = await this.prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return {
    success: true,
    message: 'Lấy danh sách roles của user thành công',
    data: userRoles,
  }
}
}