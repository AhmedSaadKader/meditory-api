import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization code (unique identifier)',
    example: 'medicare-chain',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'MediCare Pharmacy Chain',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Organization description',
    example: 'Leading pharmacy chain with 50+ locations',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Organization settings (JSON object)',
    example: { timezone: 'UTC', currency: 'USD' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}
