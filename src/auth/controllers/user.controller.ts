import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';
import { Allow } from '../decorators/allow.decorator';
import { Permission } from '../enums/permission.enum';
import { UserService } from '../services/user.service';
import { RoleService } from '../services/role.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { ResetUserPasswordDto } from '../dto/reset-user-password.dto';
import { PasswordCipherService } from '../services/password-cipher.service';
import { NativeAuthenticationMethod } from '../entities/native-authentication-method.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private passwordCipher: PasswordCipherService,
    @InjectRepository(NativeAuthenticationMethod)
    private authMethodRepository: Repository<NativeAuthenticationMethod>,
  ) {}

  @Get()
  @Allow(Permission.ReadUser)
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve a list of all users. Requires ReadUser permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      example: [
        {
          userId: 1,
          username: 'username',
          firstName: 'John',
          lastName: 'Doe',
          verified: true,
          roles: [{ roleId: 1, code: 'pharmacist', name: 'Pharmacist' }],
          createdAt: '2025-10-22T00:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async findAll() {
    const users = await this.userService.findAll();
    return users.map((user) => ({
      userId: user.userId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      verified: user.verified,
      roles: user.roles.map((role) => ({
        roleId: role.roleId,
        code: role.code,
        name: role.name,
      })),
      createdAt: user.createdAt,
    }));
  }

  @Get(':id')
  @Allow(Permission.ReadUser)
  @ApiOperation({
    summary: 'Get user by ID',
    description:
      'Retrieve detailed information about a specific user. Requires ReadUser permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'User found',
    schema: {
      example: {
        userId: 1,
        username: 'username',
        firstName: 'John',
        lastName: 'Doe',
        verified: true,
        roles: [
          {
            roleId: 1,
            code: 'pharmacist',
            name: 'Pharmacist',
            permissions: ['ReadDrug', 'CreatePrescription'],
          },
        ],
        createdAt: '2025-10-22T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      userId: user.userId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      verified: user.verified,
      roles: user.roles.map((role) => ({
        roleId: role.roleId,
        code: role.code,
        name: role.name,
        permissions: role.permissions,
      })),
      createdAt: user.createdAt,
    };
  }

  @Post()
  @Allow(Permission.CreateUser)
  @ApiOperation({
    summary: 'Create new user',
    description:
      'Create a new user account (admin operation). Requires CreateUser permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    schema: {
      example: {
        success: true,
        user: {
          userId: 2,
          username: 'newusername',
          verified: false,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async create(@Body() createUserDto: CreateUserDto) {
    // Create user
    const user = await this.userService.create({
      username: createUserDto.username,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      verified: createUserDto.verified ?? false,
    });

    // Create native auth method with password
    const passwordHash = await this.passwordCipher.hash(createUserDto.password);
    await this.authMethodRepository.save({
      user,
      userId: user.userId,
      type: 'native',
      identifier: createUserDto.username,
      passwordHash,
    });

    return {
      success: true,
      user: {
        userId: user.userId,
        username: user.username,
        verified: user.verified,
      },
    };
  }

  @Patch(':id')
  @Allow(Permission.UpdateUser)
  @ApiOperation({
    summary: 'Update user',
    description: 'Update user information. Requires UpdateUser permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    schema: {
      example: {
        success: true,
        user: {
          userId: 1,
          username: 'username',
          firstName: 'John',
          lastName: 'Doe',
          verified: true,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.userService.update(id, updateUserDto);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      user: {
        userId: user.userId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        verified: user.verified,
      },
    };
  }

  @Post(':id/reset-password')
  @Allow(Permission.UpdateUser)
  @ApiOperation({
    summary: 'Reset user password',
    description:
      'Reset password for a user (admin operation). Requires UpdateUser permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: {
        success: true,
        message: 'Password reset successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() resetPasswordDto: ResetUserPasswordDto,
  ) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userService.resetPassword(id, resetPasswordDto.newPassword);

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  @Delete(':id')
  @Allow(Permission.DeleteUser)
  @ApiOperation({
    summary: 'Delete user',
    description: 'Soft delete a user account. Requires DeleteUser permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'User deleted successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.userService.softDelete(id);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  @Post(':id/roles')
  @Allow(Permission.ManageRoles)
  @ApiOperation({
    summary: 'Assign role to user',
    description: 'Assign a role to a user. Requires ManageRoles permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({
    status: 201,
    description: 'Role assigned successfully',
    schema: {
      example: {
        success: true,
        message: 'Role assigned successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  async assignRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignRoleDto: AssignRoleDto,
  ) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.roleService.findById(assignRoleDto.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Add role to user
    const hasRole = user.roles.some((r) => r.roleId === role.roleId);
    if (!hasRole) {
      user.roles.push(role);
      await this.userService.update(id, { roles: user.roles } as any);
    }

    return {
      success: true,
      message: 'Role assigned successfully',
    };
  }

  @Delete(':id/roles/:roleId')
  @Allow(Permission.ManageRoles)
  @ApiOperation({
    summary: 'Remove role from user',
    description:
      'Remove a role assignment from a user. Requires ManageRoles permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiParam({ name: 'roleId', description: 'Role ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Role removed successfully',
    schema: {
      example: {
        success: true,
        message: 'Role removed successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async removeRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    const user = await this.userService.removeRole(id, roleId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'Role removed successfully',
    };
  }
}
