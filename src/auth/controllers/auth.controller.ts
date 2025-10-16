import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  Query,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from '../guards/auth.guard';
import { Ctx } from '../decorators/ctx.decorator';
import { Allow } from '../decorators/allow.decorator';
import { Public } from '../decorators/public.decorator';
import { RequestContext } from '../types/request-context';
import { Permission } from '../enums/permission.enum';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';

@Controller('auth')
@UseGuards(AuthGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Public()
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.authService.authenticate(
      loginDto.email,
      loginDto.password,
      req.ip,
      req.headers['user-agent'],
    );

    if ('error' in result) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error: result.error,
      });
    }

    // Set session cookie
    if (req.session) {
      req.session.token = result.token;
    }

    return res.json({
      success: true,
      token: result.token,
      user: {
        userId: result.user.userId,
        email: result.user.email,
        verified: result.user.verified,
      },
    });
  }

  @Post('logout')
  @Allow(Permission.Authenticated)
  async logout(@Req() req: Request, @Res() res: Response) {
    const sessionToken = req.session?.token;

    if (sessionToken) {
      await this.authService.logout(sessionToken);
    }

    // Clear session cookie
    if (req.session) {
      req.session = null;
    }

    return res.json({ success: true });
  }

  @Get('me')
  @Allow(Permission.Authenticated)
  async me(@Ctx() ctx: RequestContext) {
    if (!ctx.user) {
      throw new UnauthorizedException();
    }

    return {
      userId: ctx.user.userId,
      email: ctx.user.email,
      verified: ctx.user.verified,
      permissions: ctx.user.permissions,
    };
  }

  @Post('register')
  @Public()
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.firstName,
      registerDto.lastName,
    );

    return {
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        userId: user.userId,
        email: user.email,
        verified: user.verified,
      },
    };
  }

  @Get('verify')
  @Public()
  async verifyEmail(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }

    const result = await this.authService.verifyEmail(token);

    if (!result) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    return {
      success: true,
      message: 'Email verified successfully. You can now log in.',
    };
  }

  @Post('resend-verification')
  @Public()
  async resendVerification(@Body() dto: ResendVerificationDto) {
    const result = await this.authService.resendVerificationEmail(dto.email);

    if (!result) {
      throw new BadRequestException('User not found or already verified');
    }

    return {
      success: true,
      message: 'Verification email sent',
    };
  }
}
