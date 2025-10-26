import { IsString, IsNumber, IsUUID, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferStockDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  fromPharmacyId: string;

  @ApiProperty({ example: '456e7890-e89b-12d3-a456-426614174000' })
  @IsUUID()
  toPharmacyId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  drugId: number;

  @ApiProperty({ example: 'LOT2024-001' })
  @IsString()
  batchNumber: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ example: 'Emergency stock transfer' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 7 })
  @IsNumber()
  userId: number;
}
