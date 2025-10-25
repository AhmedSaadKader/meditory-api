import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
  Query,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
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
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(AuthGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description:
      'Authenticate user with username or email and password. Returns user data and session token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        success: true,
        token: 'abc123...',
        user: {
          userId: 1,
          email: 'user@example.com',
          username: 'johndoe',
          verified: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const result = await this.authService.authenticate(
      loginDto.usernameOrEmail,
      loginDto.password,
      req.ip,
      req.headers['user-agent'],
    );

    if ('error' in result) {
      throw new UnauthorizedException(result.error);
    }

    // Set session cookie
    if (req.session) {
      req.session.token = result.token;
    }

    return {
      success: true,
      token: result.token,
      user: {
        userId: result.user.userId,
        email: result.user.email,
        username: result.user.username,
        verified: result.user.verified,
      },
    };
  }

  @Post('logout')
  @Allow(Permission.Authenticated)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout',
    description: 'Invalidate current session and clear session cookie',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      example: {
        success: true,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async logout(@Req() req: Request) {
    const sessionToken = req.session?.token;

    if (sessionToken) {
      await this.authService.logout(sessionToken);
    }

    // Clear session cookie
    if (req.session) {
      req.session = null;
    }

    return { success: true };
  }

  @Get('me')
  @Allow(Permission.Authenticated)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user',
    description: 'Get authenticated user information',
  })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved',
    schema: {
      example: {
        userId: 1,
        email: 'user@example.com',
        username: 'johndoe',
        verified: true,
        permissions: ['Authenticated'],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  me(@Ctx() ctx: RequestContext) {
    if (!ctx.user) {
      throw new UnauthorizedException();
    }

    return {
      userId: ctx.user.userId,
      email: ctx.user.email,
      username: ctx.user.username,
      verified: ctx.user.verified,
      permissions: ctx.user.permissions,
    };
  }

  @Post('register')
  @Public()
  @ApiOperation({
    summary: 'Register new user',
    description:
      'Create a new user account. You can login immediately after registration.',
  })
  @ApiResponse({
    status: 201,
    description: 'Registration successful',
    schema: {
      example: {
        success: true,
        message: 'Registration successful. You can now log in.',
        user: {
          userId: 1,
          email: 'newuser@example.com',
          username: 'johndoe',
          verified: true,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 409,
    description: 'Email or username already registered',
  })
  async register(@Body() registerDto: RegisterDto) {
    try {
      const user = await this.authService.register(
        registerDto.email,
        registerDto.password,
        registerDto.username,
        registerDto.firstName,
        registerDto.lastName,
      );

      return {
        success: true,
        message: 'Registration successful. You can now log in.',
        user: {
          userId: user.userId,
          email: user.email,
          username: user.username,
          verified: user.verified,
        },
      };
    } catch (error: unknown) {
      // Check if it's a duplicate email/username error (PostgreSQL unique violation)
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('Email or username already registered');
      }
      throw error;
    }
  }

  @Get('verify')
  @Public()
  @ApiOperation({
    summary: 'Verify email',
    description:
      'Verify user email address with verification token sent via email',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      example: {
        success: true,
        message: 'Email verified successfully. You can now log in.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
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
  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Request a new verification email for unverified accounts',
  })
  @ApiResponse({
    status: 201,
    description: 'Verification email sent (if account exists and not verified)',
    schema: {
      example: {
        success: true,
        message: 'Verification email sent.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email or already verified',
  })
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

  @Post('request-password-reset')
  @Public()
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Request a password reset email. Always returns success to prevent email enumeration.',
  })
  @ApiResponse({
    status: 201,
    description: 'Password reset requested',
    schema: {
      example: {
        success: true,
        message:
          'If an account with that email exists, a password reset link has been sent.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    // Always return success (Vendure pattern - prevents email enumeration)
    await this.authService.requestPasswordReset(dto.email);

    return {
      success: true,
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description:
      'Reset password using token from password reset email. Invalidates all existing sessions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    schema: {
      example: {
        success: true,
        message:
          'Password has been reset successfully. Please log in with your new password.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(
      dto.token,
      dto.password,
    );

    if (!result) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    return {
      success: true,
      message:
        'Password has been reset successfully. Please log in with your new password.',
    };
  }
}
