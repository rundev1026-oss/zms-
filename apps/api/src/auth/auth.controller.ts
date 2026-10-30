import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../common/public.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from '../common/auth-user';
import {
  Disable2faDto,
  Enable2faDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  Verify2faDto,
} from '../common/request.dto';
import { UsersService } from '../users/users.service';
import { AuthService, REFRESH_COOKIE } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'เข้าสู่ระบบ (รองรับ 2FA TOTP)' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userAgent = request.headers['user-agent'];
    const result = await this.auth.login(dto.email, dto.password, ip, userAgent);

    if (result.mfaRequired) {
      return {
        mfaRequired: true,
        tempToken: result.tempToken,
        expiresIn: result.expiresIn,
        userId: result.userId,
        email: result.email,
      };
    }

    response.cookie(REFRESH_COOKIE, result.refreshToken, this.auth.cookieOptions());
    return {
      mfaRequired: false,
      accessToken: result.accessToken,
      tokenType: 'Bearer' as const,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @Public()
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ยืนยันรหัส 2FA TOTP หรือ Recovery code ในขั้นตอนเข้าสู่ระบบ' })
  async verify2fa(
    @Body() dto: Verify2faDto,
    @Ip() ip: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userAgent = request.headers['user-agent'];
    const session = await this.auth.verify2fa(dto.tempToken, dto.code, ip, userAgent);
    response.cookie(REFRESH_COOKIE, session.refreshToken, this.auth.cookieOptions());
    return {
      mfaRequired: false,
      accessToken: session.accessToken,
      tokenType: 'Bearer' as const,
      expiresIn: session.expiresIn,
      user: session.user,
    };
  }

  @Get('2fa/setup')
  @ApiOperation({ summary: 'สร้าง TOTP secret และ Recovery codes สำหรับตั้งค่า 2FA' })
  async setup2fa(@CurrentUser() user: AuthUser) {
    return this.auth.setup2fa(user.id);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ยืนยันและเปิดใช้งาน 2FA TOTP' })
  async enable2fa(
    @CurrentUser() user: AuthUser,
    @Body() dto: Enable2faDto,
  ) {
    return this.auth.enable2fa(user.id, dto.code, dto.secret, dto.recoveryCodes);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ยกเลิกการใช้งาน 2FA TOTP' })
  async disable2fa(
    @CurrentUser() user: AuthUser,
    @Body() dto: Disable2faDto,
  ) {
    return this.auth.disable2fa(user.id, dto.password, dto.code);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ขอรับลิงก์รีเซ็ตรหัสผ่านทางอีเมล' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Ip() ip: string,
  ) {
    return this.auth.forgotPassword(dto.email, ip);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ตั้งรหัสผ่านใหม่ด้วย Reset Token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'หมุน refresh token จาก HttpOnly cookie' })
  async refresh(
    @Req() request: Request,
    @Headers('x-zms-csrf') csrf: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const raw = readRefreshCookie(request);
    const session = await this.auth.refresh(raw, csrf);
    response.cookie(REFRESH_COOKIE, session.refreshToken, this.auth.cookieOptions());
    return {
      accessToken: session.accessToken,
      tokenType: 'Bearer' as const,
      expiresIn: session.expiresIn,
      user: session.user,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'เพิกถอน refresh token ของเซสชันนี้' })
  @ApiOkResponse({ description: 'ออกจากระบบแล้ว' })
  async logout(
    @Req() request: Request,
    @Headers('x-zms-csrf') csrf: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(readRefreshCookie(request), csrf, null);
    const options = this.auth.cookieOptions();
    response.clearCookie(REFRESH_COOKIE, {
      httpOnly: options.httpOnly,
      sameSite: options.sameSite,
      secure: options.secure,
      path: options.path,
    });
    return { loggedOut: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'ผู้ใช้ บทบาท และสิทธิ์จากฐานข้อมูล' })
  async me(@CurrentUser() user: AuthUser) {
    const profile = await this.users.findUserById(user.id);
    return this.users.toProfile(user, profile?.mfaEnabled ?? false);
  }
}

function readRefreshCookie(request: Request): string | undefined {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' ? value : undefined;
}
