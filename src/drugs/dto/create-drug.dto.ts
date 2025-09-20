import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDrugDto {
  @ApiProperty()
  @IsOptional()
  @IsNumber()
  original_id?: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  oldprice?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  active_raw?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  img?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  dosage_form?: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  @Min(1)
  units?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  route?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  pharmacology?: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  @Min(0)
  sold_times?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  date_updated?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  cosmo?: number;
}
