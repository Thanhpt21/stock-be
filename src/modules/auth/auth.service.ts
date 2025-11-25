import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from 'src/modules/users/dto/user-response.dto';
import { PrismaService } from 'prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/forgot-password.dto';
import * as jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 🟢 Đăng ký
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) throw new BadRequestException('Email đã được sử dụng');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
      },
    });

    const token = await this.signToken(user.id, user.email, user.role);

    return {
      user: new UserResponseDto(user),
      access_token: token,
    };
  }

  // 🟡 Đăng nhập
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Email không tồn tại');

    if (!user.password) {
      throw new UnauthorizedException(
        'Tài khoản này không thể đăng nhập bằng mật khẩu',
      );
    }

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) throw new UnauthorizedException('Sai mật khẩu');

    const token = await this.signToken(user.id, user.email, user.role);
    return { user: new UserResponseDto(user), access_token: token };
  }

  // 🧾 Sinh JWT (bỏ role)
  private async signToken(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role};
    return this.jwtService.signAsync(payload);
  }

  // 🔐 Đổi mật khẩu
  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password || '');
    if (!isMatch)
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  // ✉️ Gửi mail reset password
  private async sendResetEmail(email: string, token: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Yêu cầu đặt lại mật khẩu',
      html: `
        <h2>Xin chào!</h2>
        <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
        <p>Vui lòng nhấn vào liên kết bên dưới để đặt lại mật khẩu (hết hạn sau 15 phút):</p>
        <a href="${resetLink}" style="color: #1e88e5;">Đặt lại mật khẩu</a>
        <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      `,
    });
  }

  // 🧠 Quên mật khẩu
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException('Không tìm thấy người dùng với email này');

    const secret = process.env.JWT_SECRET || 'default-secret';
    const token = jwt.sign({ email: user.email }, secret, { expiresIn: '15m' });

    await this.prisma.user.update({
      where: { email: user.email },
      data: {
        resetToken: token,
        resetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await this.sendResetEmail(user.email, token);
    return { message: 'Đã gửi email đặt lại mật khẩu' };
  }

  // 🔄 Đặt lại mật khẩu
  async resetPassword(dto: ResetPasswordDto) {
    const secret = process.env.JWT_SECRET || 'default-secret';
    let payload: any;
    try {
      payload = jwt.verify(dto.token, secret);
    } catch {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user || user.resetToken !== dto.token) {
      throw new BadRequestException('Token không hợp lệ hoặc đã được sử dụng');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { email: user.email },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Đặt lại mật khẩu thành công' };
  }

  // 🆕 OAuth2 (Google / Facebook)
  async validateOAuthUser(oauthUser: any) {
    const { email, name, photo, provider } = oauthUser;

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          avatar: photo,
          isActive: true,
          type_account: provider,
        },
      });
    }

    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return { user, access_token };
  }
}
