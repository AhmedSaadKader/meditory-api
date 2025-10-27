import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';

/**
 * DTO for status transitions
 * Follows ERPNext workflow: DRAFT -> SUBMITTED -> RECEIVED -> COMPLETED
 */
export class UpdatePurchaseOrderStatusDto {
  @IsEnum(PurchaseOrderStatus)
  status: PurchaseOrderStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
