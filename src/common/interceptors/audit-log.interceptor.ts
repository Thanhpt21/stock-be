// audit-log.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { SKIP_AUDIT_LOG_KEY } from '../decorators/skip-audit-log.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService, private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
    const skipAudit = this.reflector.getAllAndOverride<boolean>(
      SKIP_AUDIT_LOG_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipAudit) {
      return next.handle(); // ✅ Bỏ qua audit
    }
    const req = context.switchToHttp().getRequest();


    const user = req.user;
    const userId = user?.id || null; // ✅ Đơn giản hóa, không cần check role

    const action = `${req.method}_${req.route?.path || req.url}`;
    const payload = { ...req.body };

    // Không lưu password
    if (payload.password) delete payload.password;

    return next.handle().pipe(
      tap(async () => {
        try {
          await this.auditLogService.create({
            userId: userId,
            action,
            method: req.method,
            route: req.route?.path || req.url,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            payload,
          });
        } catch (err) {
          console.error('Audit log error:', err);
        }
      }),
    );
  }
}
