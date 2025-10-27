import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';

/**
 * Only DRAFT orders can be updated
 * Once submitted, orders follow the ERPNext amendment pattern
 */
export class UpdatePurchaseOrderDto extends PartialType(
  OmitType(CreatePurchaseOrderDto, ['code'] as const),
) {}
