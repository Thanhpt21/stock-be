// src/common/decorators/tenant-id.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (_, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().tenantId
);
