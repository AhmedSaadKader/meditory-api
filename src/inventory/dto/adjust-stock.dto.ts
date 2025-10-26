import { IsString, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  pharmacyId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  drugId: number;

  @ApiProperty({ example: 'LOT2024-001' })
  @IsString()
  batchNumber: string;

  @ApiProperty({ example: -5, description: 'Positive to add, negative to subtract' })
  @IsNumber()
  adjustmentQuantity: number;

  @ApiProperty({ example: 'Physical count discrepancy' })
  @IsString()
  reason: string;
}
