import {
  IsString,
  IsUUID,
  IsDate,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseOrderItemDto {
  @IsUUID()
  drugId: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expectedDeliveryDate?: Date;

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

export class CreatePurchaseOrderDto {
  @IsString()
  code: string;

  @IsUUID()
  supplierId: string;

  @IsDate()
  @Type(() => Date)
  orderDate: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expectedDeliveryDate?: Date;

  @IsOptional()
  @IsUUID()
  pharmacyId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];

  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
