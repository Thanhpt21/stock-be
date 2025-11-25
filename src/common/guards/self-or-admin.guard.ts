import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

interface JwtUser {
  id: number;
  email: string;
  role: string;
}

@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtUser;
    const paramId = parseInt(request.params.id, 10);

    return user.role === 'admin' || user.id === paramId;
  }
}
