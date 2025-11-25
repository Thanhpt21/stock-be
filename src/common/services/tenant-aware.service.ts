// src/common/services/tenant-aware.service.ts
import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export abstract class TenantAwareService {
  constructor(
    protected prisma: PrismaService,
    @Inject(REQUEST) protected readonly request: Request | any, // 'any' để tránh TS complain
  ) {}

  /**
   * Lấy tenantId từ request.user (JWT) hoặc headers['x-tenant-id']
   * Nếu không có -> throw Forbidden
   */
  protected get tenantId(): number {
    const user = this.request.user as any; // JWT đã attach
    const tenantId = user?.tenantId || this.request.headers?.['x-tenant-id'];

    if (!tenantId) throw new ForbiddenException('Tenant not specified');

    const parsed = Number(tenantId);
    if (Number.isNaN(parsed)) throw new ForbiddenException('TenantId invalid');

    return parsed;
  }
}
