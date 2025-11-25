import { Controller, Get, Query, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { SkipAuditLog } from 'src/common/decorators/skip-audit-log.decorator';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @SkipAuditLog() 
  @Permissions('read_audit_log') // Chỉ user có permission này mới xem được
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('tenantId') tenantId?: number,
  ) {
    return this.auditLogService.findAll(+page, +limit, search, tenantId ? +tenantId : undefined);
  }

  @Get('formatted')
  @SkipAuditLog() 
async getFormatted(
  @Query('page', new ParseIntPipe({ optional: true })) page = 1,
  @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
) {
  const formattedLogs = await this.auditLogService.getFormattedLogs(page, limit);
  return {
    success: true,
    message: 'Audit log dạng dễ đọc',
    data: formattedLogs,
  };
}


  

  @Get(':id')
  @SkipAuditLog() 
  @Permissions('read_a_audit_log')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditLogService.findOne(id);
  }




}
