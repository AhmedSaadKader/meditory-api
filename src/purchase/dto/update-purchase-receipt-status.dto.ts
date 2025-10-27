import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PurchaseReceiptStatus } from '../entities/purchase-receipt.entity';

/**
 * DTO for status transitions
 * Follows ERPNext workflow: DRAFT -> SUBMITTED -> COMPLETED
 */
export class UpdatePurchaseReceiptStatusDto {
  @IsEnum(PurchaseReceiptStatus)
  status: PurchaseReceiptStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
