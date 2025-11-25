export class AuditLogResponseDto {
  tenantId?: number | null;
   userId?: number | null;
  action: string;
  resource?: string | null;      // thêm resource nếu muốn hiển thị
  resourceId?: number | null;    // thêm resourceId nếu muốn hiển thị
  method?: string | null;
  route?: string | null;
  ip?: string | null;            // tương ứng ip trong DB
  userAgent?: string | null;
  payload?: any;                 // JSON payload
  createdAt: Date;

  constructor(partial: Partial<AuditLogResponseDto>) {
    Object.assign(this, partial);
  }
}
