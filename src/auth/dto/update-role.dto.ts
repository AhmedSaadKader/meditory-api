import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Permission } from '../enums/permission.enum';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: 'Unique code identifier for the role (cannot be changed for system roles)',
    example: 'cashier',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    description: 'Human-readable name for the role',
    example: 'Cashier',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the role',
    example: 'Handles sales and customer transactions',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Array of permissions assigned to this role',
    example: ['ReadDrug', 'ReadInventory', 'ViewSalesReports'],
    isArray: true,
    enum: Permission,
  })
  @IsArray()
  @IsOptional()
  permissions?: Permission[];
}
