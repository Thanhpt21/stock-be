import { UserRole } from '@prisma/client';

export class UserRoleResponseDto {
  userId: number;
  roleId: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(userRole: UserRole) {
    this.userId = userRole.userId;
    this.roleId = userRole.roleId;
    this.createdAt = userRole.createdAt;
    this.updatedAt = userRole.updatedAt;
  }
}
