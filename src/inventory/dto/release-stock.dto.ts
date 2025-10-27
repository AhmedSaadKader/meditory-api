import { IsString, IsNumber, IsUUID, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReleaseStockDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  pharmacyId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  drugId: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: 'prescription' })
  @IsString()
  referenceType: string;

  @ApiProperty({ example: 'RX-2024-001' })
  @IsString()
  referenceNumber: string;

  @ApiPropertyOptional({ example: 'Prescription cancelled' })
  @IsString()
  @IsOptional()
  reason?: string;
}
