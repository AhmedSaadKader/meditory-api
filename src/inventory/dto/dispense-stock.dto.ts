import { IsString, IsNumber, IsUUID, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DispenseStockDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  pharmacyId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  drugId: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ example: 'RX-2024-001' })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiPropertyOptional({ example: 'Dispensed for prescription #12345' })
  @IsString()
  @IsOptional()
  notes?: string;
}
