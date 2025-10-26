import {
  IsString,
  IsNumber,
  IsUUID,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReceiveStockDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  pharmacyId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  drugId: number;

  @ApiProperty({ example: 'LOT2024-001' })
  @IsString()
  batchNumber: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: '2026-12-31', description: 'Expiry date must be in the future' })
  @IsDateString()
  expiryDate: string;

  @ApiProperty({ example: 5.5 })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiPropertyOptional({ example: 8.0, description: 'If not provided, uses drug reference price' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  sellingPrice?: number;

  @ApiPropertyOptional({ example: 'ABC Pharmaceuticals' })
  @IsString()
  @IsOptional()
  supplierName?: string;

  @ApiPropertyOptional({ example: 'INV-2024-001' })
  @IsString()
  @IsOptional()
  supplierInvoiceNumber?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minimumStockLevel?: number;

  @ApiPropertyOptional({ example: 'First shipment of the month' })
  @IsString()
  @IsOptional()
  notes?: string;
}
