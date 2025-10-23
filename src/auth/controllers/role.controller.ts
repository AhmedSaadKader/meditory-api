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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AuthGuard } from '../guards/auth.guard';
import { Allow } from '../decorators/allow.decorator';
import { Permission } from '../enums/permission.enum';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(AuthGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @Allow(Permission.ReadUser)
  @ApiOperation({
    summary: 'Get all roles',
    description: 'Retrieve a list of all roles. Requires ReadUser permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Roles retrieved successfully',
    schema: {
      example: [
        {
          roleId: 1,
          code: 'superadmin',
          name: 'Super Administrator',
          description: 'Full system access',
          permissions: ['SuperAdmin'],
          isSystem: true,
          createdAt: '2025-10-23T00:00:00.000Z',
          updatedAt: '2025-10-23T00:00:00.000Z',
        },
      ],
    },
  })
  async findAll() {
    return this.roleService.findAll();
  }

  @Get('permissions')
  @Allow(Permission.ReadUser)
  @ApiOperation({
    summary: 'Get all assignable permissions',
    description: 'Retrieve a list of all permissions that can be assigned to roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Assignable permissions retrieved',
    schema: {
      example: {
        permissions: [
          'ReadDrug',
          'CreateDrug',
          'UpdateDrug',
          'DeleteDrug',
          'ReadUser',
          'CreateUser',
          'UpdateUser',
          'DeleteUser',
          'ManageRoles',
        ],
      },
    },
  })
  async getAssignablePermissions() {
    return {
      permissions: this.roleService.getAssignablePermissions(),
    };
  }

  @Get(':id')
  @Allow(Permission.ReadUser)
  @ApiOperation({
    summary: 'Get role by ID',
    description: 'Retrieve a specific role by ID. Requires ReadUser permission.',
  })
  @ApiParam({ name: 'id', description: 'Role ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Role retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const role = await this.roleService.findById(id);
    if (!role) {
      return { error: 'Role not found' };
    }
    return role;
  }

  @Post()
  @Allow(Permission.ManageRoles)
  @ApiOperation({
    summary: 'Create a new role',
    description: 'Create a new role with specified permissions. Requires ManageRoles permission. Automatically adds Authenticated permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Role created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or role code already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  @Patch(':id')
  @Allow(Permission.ManageRoles)
  @ApiOperation({
    summary: 'Update a role',
    description: 'Update an existing role. Cannot modify system roles. Requires ManageRoles permission.',
  })
  @ApiParam({ name: 'id', description: 'Role ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot modify system role or invalid permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @Allow(Permission.ManageRoles)
  @ApiOperation({
    summary: 'Delete a role',
    description: 'Delete a role. Cannot delete system roles. Requires ManageRoles permission.',
  })
  @ApiParam({ name: 'id', description: 'Role ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Role deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Role deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete system role',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.roleService.delete(id);
    return {
      success: true,
      message: 'Role deleted successfully',
    };
  }
}
