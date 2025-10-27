import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrganizationService } from '../services/organization.service';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { AuthGuard } from '../guards/auth.guard';
import { Allow } from '../decorators/allow.decorator';
import { Permission } from '../enums/permission.enum';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @Allow(Permission.PlatformSuperAdmin)
  @ApiOperation({
    summary: 'Create organization',
    description: 'Create a new organization (Platform SuperAdmin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Organization code already exists',
  })
  async create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return await this.organizationService.create(createOrganizationDto);
  }

  @Get()
  @Allow(Permission.PlatformSuperAdmin)
  @ApiOperation({
    summary: 'Get all organizations',
    description: 'Retrieve all organizations (Platform SuperAdmin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
  })
  async findAll() {
    return await this.organizationService.findAll();
  }

  @Get(':id')
  @Allow(Permission.PlatformSuperAdmin, Permission.SuperAdmin)
  @ApiOperation({
    summary: 'Get organization by ID',
    description:
      'Retrieve organization details (Platform SuperAdmin or Organization SuperAdmin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  async findOne(@Param('id') id: string) {
    return await this.organizationService.findOne(id);
  }

  @Patch(':id')
  @Allow(Permission.PlatformSuperAdmin)
  @ApiOperation({
    summary: 'Update organization',
    description: 'Update organization details (Platform SuperAdmin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Organization code already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return await this.organizationService.update(id, updateOrganizationDto);
  }

  @Post(':id/regenerate-token')
  @Allow(Permission.PlatformSuperAdmin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Regenerate organization API token',
    description:
      'Generate a new API token for the organization (Platform SuperAdmin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Token regenerated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  async regenerateToken(@Param('id') id: string) {
    return await this.organizationService.regenerateToken(id);
  }

  @Post(':id/activate')
  @Allow(Permission.PlatformSuperAdmin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate organization',
    description: 'Activate a deactivated organization (Platform SuperAdmin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization activated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  async activate(@Param('id') id: string) {
    return await this.organizationService.activate(id);
  }

  @Post(':id/deactivate')
  @Allow(Permission.PlatformSuperAdmin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate organization',
    description:
      'Deactivate an organization (prevents login) (Platform SuperAdmin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization deactivated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  async deactivate(@Param('id') id: string) {
    return await this.organizationService.deactivate(id);
  }

  @Delete(':id')
  @Allow(Permission.PlatformSuperAdmin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete organization',
    description:
      'Delete organization (soft delete by deactivating) (Platform SuperAdmin only)',
  })
  @ApiResponse({
    status: 204,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  async remove(@Param('id') id: string) {
    await this.organizationService.remove(id);
  }
}
