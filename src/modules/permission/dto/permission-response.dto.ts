import { Permission } from '@prisma/client';

export class PermissionResponseDto {
  id: number;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(permission: Permission) {
    this.id = permission.id;
    this.name = permission.name;
    this.description = permission.description ?? undefined;
    this.createdAt = permission.createdAt;
    this.updatedAt = permission.updatedAt;
  }
}
