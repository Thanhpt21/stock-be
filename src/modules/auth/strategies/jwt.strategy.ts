import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      // ĐỌC TOKEN TỪ COOKIE thay vì header
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Lấy token từ cookie
          let token = null;
          if (request && request.cookies) {
            token = request.cookies['access_token'];
          }
          return token;
        },
        // Fallback: nếu không có cookie thì đọc từ header (cho API clients khác)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'F3!r7@xP9#sLq2ZmV&bNcT*UYj8dWvHr',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        type_account: true,
        avatar: true,
        isActive: true,
      },
    });
    
    if (!user) {
      return null; // Hoặc throw UnauthorizedException
    }
    
    return user;
  }
}