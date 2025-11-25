// src/common/guards/permissions.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lấy danh sách permission yêu cầu từ decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu route không yêu cầu permission thì cho phép luôn
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // JwtAuthGuard gắn user vào request

    if (!user) {
      throw new ForbiddenException('User not found in request');
    }

    // Nếu user là admin toàn cục thì bỏ qua check
    if (user.role === 'admin') {
      return true;
    }

    // Lấy tất cả role của user
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    // Nếu user không có role nào → cấm
    if (!userRoles.length) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện hành động này, vui lòng liên hệ quản trị viên',
      );
    }

    // Gom tất cả permission của user từ các role
    const userPermissions = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        userPermissions.add(rp.permission.name);
      }
    }

    // Kiểm tra user có đầy đủ permission yêu cầu không
    const hasAllPermissions = requiredPermissions.every((p) =>
      userPermissions.has(p),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện hành động này, vui lòng liên hệ quản trị viên',
      );
    }

    return true;
  }
}
