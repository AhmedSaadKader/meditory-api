import { IsString, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferStockDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  fromPharmacyId: string;

  @ApiProperty({ example: '987f6543-e21c-45d6-b789-123456789abc' })
  @IsUUID()
  toPharmacyId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  drugId: number;

  @ApiProperty({ example: 'LOT2024-001' })
  @IsString()
  batchNumber: string;

  @ApiProperty({ example: 25 })
  @IsNumber()
  @Min(0.01)
  quantity: number;
}
