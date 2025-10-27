import {
  IsString,
  IsUUID,
  IsDate,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseReceiptItemDto {
  @IsOptional()
  @IsUUID()
  purchaseOrderItemId?: string;

  @IsUUID()
  drugId: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsString()
  batchNumber: string;

  @IsDate()
  @Type(() => Date)
  expiryDate: Date;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  conversionFactor?: number;

  @IsOptional()
  @IsString()
  stockUom?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreatePurchaseReceiptDto {
  @IsString()
  code: string;

  @IsUUID()
  supplierId: string;

  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @IsDate()
  @Type(() => Date)
  postingDate: Date;

  @IsUUID()
  pharmacyId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseReceiptItemDto)
  items: CreatePurchaseReceiptItemDto[];

  @IsOptional()
  @IsString()
  supplierDeliveryNote?: string;

  @IsOptional()
  @IsString()
  lrNo?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lrDate?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
