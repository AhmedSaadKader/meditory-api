import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Permission } from '../enums/permission.enum';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Unique code identifier for the role',
    example: 'cashier',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Human-readable name for the role',
    example: 'Cashier',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the role',
    example: 'Handles sales and customer transactions',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Array of permissions assigned to this role',
    example: ['ReadDrug', 'ReadInventory'],
    isArray: true,
    enum: Permission,
  })
  @IsArray()
  @IsNotEmpty()
  permissions: Permission[];
}
