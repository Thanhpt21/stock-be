import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/forgot-password.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 🟢 Đăng ký
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // // 🟡 Đăng nhập
  // @Post('login')
  // async login(
  //   @Body() dto: LoginDto,
  //   @Res({ passthrough: true }) res: Response,
  // ) {
  //   const { user, access_token } = await this.authService.login(dto);

  //   res.cookie('access_token', access_token, {
  //     httpOnly: true,
  //     secure: process.env.NODE_ENV === 'production',
  //     maxAge: 1000 * 60 * 60 * 24 * 7, // 7 ngày
  //     sameSite: 'lax',
  //     path: '/',
  //   });

  //   return { user, access_token };
  // }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, access_token } = await this.authService.login(dto);

    // Cấu hình cho localhost
    const isLocalhost = process.env.NODE_ENV !== 'production';
    
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: false, 
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 ngày
      sameSite: 'lax',
      path: '/',
      domain: isLocalhost ? 'localhost' : undefined, // Thêm domain cho localhost
    });

    return { user, access_token };
  }

  // 🔴 Đăng xuất
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return { message: 'Đăng xuất thành công' };
  }

  // 🔐 Đổi mật khẩu
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const userId = (req as any).user.id; // JwtAuthGuard sẽ attach user
    return this.authService.changePassword(userId, dto);
  }

  // ✉️ Quên mật khẩu
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // 🔄 Đặt lại mật khẩu
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // 👤 Lấy thông tin người dùng hiện tại
  @Get('current')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: any) {
    return {
      success: true,
      message: 'Lấy thông tin người dùng thành công',
      data: user,
    };
  }

  // 🌐 Google OAuth
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    return { message: 'Redirecting to Google...' };
  }

  // 🔁 Google callback
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, access_token } = req.user;

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Đăng nhập Google thành công',
      user,
      access_token,
    };
  }
}
