import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { AuditLog, Prisma } from '@prisma/client';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { formatAuditLogs } from 'src/interfaces/audit-log-entry';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: dto,
    });
  }

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    tenantId?: number,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { action: { contains: search, mode: 'insensitive' } },
                { route: { contains: search, mode: 'insensitive' } },
                { method: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        // Include user relationship if it exists
        include: {
          user: true, // Include user data (assuming your relation is with 'user')
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách audit log thành công',
      data: {
        data: logs.map((log) => new AuditLogResponseDto(log)),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) {
      return { success: false, message: 'Audit log không tồn tại' };
    }
    return {
      success: true,
      message: 'Lấy audit log thành công',
      data: new AuditLogResponseDto(log),
    };
  }

  async getFormattedLogs(page?: number, limit?: number) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: page && limit ? (page - 1) * limit : undefined,
      take: limit,
      // Include user relationship to fetch 'user' data
      include: {
        user: true, // Assuming this is your user relationship
      },
    });

    // Map sang AuditLogEntry với userId
    const entries = logs.map(log => ({
      id: log.id,
      userId: log.user?.id ?? null, // Ensure you access userId through user relation
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      method: log.method ?? undefined,
      route: log.route ?? undefined,
      payload: log.payload && typeof log.payload === 'object' ? (log.payload as Record<string, any>) : null,
      createdAt: log.createdAt.toISOString(),
    }));

    return formatAuditLogs(entries);
  }
}
