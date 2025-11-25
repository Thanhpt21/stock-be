import { Role } from '@prisma/client';

export class RoleResponseDto {
  id: number;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(role: Role) {
    this.id = role.id;
    this.name = role.name;
    this.description = role.description ?? undefined;
    this.createdAt = role.createdAt;
    this.updatedAt = role.updatedAt;
  }
}
