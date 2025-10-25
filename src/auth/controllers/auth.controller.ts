import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
  UnauthorizedException,
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
      'Authenticate user with username and password. Returns user data and session token.',
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
      loginDto.username,
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
          username: 'johndoe',
          verified: true,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 409,
    description: 'Username already registered',
  })
  async register(@Body() registerDto: RegisterDto) {
    try {
      const user = await this.authService.register(
        registerDto.username,
        registerDto.password,
        registerDto.firstName,
        registerDto.lastName,
      );

      return {
        success: true,
        message: 'Registration successful. You can now log in.',
        user: {
          userId: user.userId,
          username: user.username,
          verified: user.verified,
        },
      };
    } catch (error: unknown) {
      // Check if it's a duplicate username error (PostgreSQL unique violation)
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('Username already registered');
      }
      throw error;
    }
  }
}
