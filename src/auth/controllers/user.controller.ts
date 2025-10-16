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
import { AuthGuard } from '../guards/auth.guard';
import { Allow } from '../decorators/allow.decorator';
import { Permission } from '../enums/permission.enum';
import { UserService } from '../services/user.service';
import { RoleService } from '../services/role.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { PasswordCipherService } from '../services/password-cipher.service';
import { NativeAuthenticationMethod } from '../entities/native-authentication-method.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
  async findAll() {
    const users = await this.userService.findAll();
    return users.map((user) => ({
      userId: user.userId,
      email: user.email,
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
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      userId: user.userId,
      email: user.email,
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
  async create(@Body() createUserDto: CreateUserDto) {
    // Create user
    const user = await this.userService.create({
      email: createUserDto.email,
      username: createUserDto.email,
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
      identifier: createUserDto.email,
      passwordHash,
    });

    return {
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        verified: user.verified,
      },
    };
  }

  @Patch(':id')
  @Allow(Permission.UpdateUser)
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
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        verified: user.verified,
      },
    };
  }

  @Delete(':id')
  @Allow(Permission.DeleteUser)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.userService.softDelete(id);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  @Post(':id/roles')
  @Allow(Permission.ManageRoles)
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
