import { IsString, IsOptional, IsEmail, IsBoolean, IsNumber, Min, Max, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SupplierType } from '../entities/supplier.entity';

class PaymentTermsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountDays?: number;
}

export class CreateSupplierDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsEnum(SupplierType)
  supplierType?: SupplierType;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentTermsDto)
  paymentTerms?: PaymentTermsDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
