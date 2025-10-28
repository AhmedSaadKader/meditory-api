import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  PurchaseReceipt,
  PurchaseReceiptItem,
  PurchaseReceiptStatus,
} from '../entities/purchase-receipt.entity';
import {
  PurchaseOrder,
  PurchaseOrderItem,
} from '../entities/purchase-order.entity';
import { CreatePurchaseReceiptDto } from '../dto/create-purchase-receipt.dto';
import { UpdatePurchaseReceiptStatusDto } from '../dto/update-purchase-receipt-status.dto';
import { StockService } from '../../inventory/stock/stock.service';
import { PurchaseOrderService } from './purchase-order.service';
import { RequestContext } from '../../auth/types/request-context';

@Injectable()
export class PurchaseReceiptService {
  constructor(
    @InjectRepository(PurchaseReceipt)
    private purchaseReceiptRepository: Repository<PurchaseReceipt>,
    @InjectRepository(PurchaseReceiptItem)
    private purchaseReceiptItemRepository: Repository<PurchaseReceiptItem>,
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private purchaseOrderItemRepository: Repository<PurchaseOrderItem>,
    private dataSource: DataSource,
    private stockService: StockService,
    private purchaseOrderService: PurchaseOrderService,
  ) {}

  /**
   * Create a new purchase receipt in DRAFT status
   * Following ERPNext pattern: all receipts start as drafts
   */
  async create(
    organizationId: string,
    dto: CreatePurchaseReceiptDto,
  ): Promise<PurchaseReceipt> {
    return this.dataSource.transaction(async (manager) => {
      // Check if code is unique within organization
      const existing = await manager.findOne(PurchaseReceipt, {
        where: { organizationId, code: dto.code },
      });

      if (existing) {
        throw new BadRequestException(
          `Purchase receipt with code "${dto.code}" already exists`,
        );
      }

      // If linked to PO, validate PO exists and belongs to same org/supplier
      if (dto.purchaseOrderId) {
        const po = await manager.findOne(PurchaseOrder, {
          where: { id: dto.purchaseOrderId, organizationId },
        });

        if (!po) {
          throw new NotFoundException('Purchase order not found');
        }

        if (po.supplierId !== dto.supplierId) {
          throw new BadRequestException(
            'Purchase receipt supplier must match purchase order supplier',
          );
        }
      }

      // Calculate totals
      let subtotal = 0;
      let totalTax = 0;
      let totalQuantity = 0;

      const items = dto.items.map((itemDto) => {
        const amount = itemDto.quantity * itemDto.unitPrice;
        const taxRate = itemDto.taxRate || 0;
        const taxAmount = (amount * taxRate) / 100;
        const conversionFactor = itemDto.conversionFactor || 1;
        const stockQuantity = itemDto.quantity * conversionFactor;

        subtotal += amount;
        totalTax += taxAmount;
        totalQuantity += itemDto.quantity;

        const item = manager.create(PurchaseReceiptItem, {
          purchaseOrderItemId: itemDto.purchaseOrderItemId,
          drugId: itemDto.drugId,
          quantity: itemDto.quantity,
          unitPrice: itemDto.unitPrice,
          amount,
          batchNumber: itemDto.batchNumber,
          expiryDate: itemDto.expiryDate,
          uom: itemDto.uom || 'Unit',
          conversionFactor,
          stockUom: itemDto.stockUom || 'Unit',
          stockQuantity,
          taxRate,
          taxAmount,
          description: itemDto.description,
        });

        return item;
      });

      const grandTotal = subtotal + totalTax;

      // Create receipt
      const receipt = manager.create(PurchaseReceipt, {
        organizationId,
        code: dto.code,
        supplierId: dto.supplierId,
        purchaseOrderId: dto.purchaseOrderId,
        status: PurchaseReceiptStatus.DRAFT,
        docStatus: 0, // Draft
        postingDate: dto.postingDate,
        pharmacyId: dto.pharmacyId,
        totalQuantity,
        subtotal,
        totalTax,
        grandTotal,
        supplierDeliveryNote: dto.supplierDeliveryNote,
        lrNo: dto.lrNo,
        lrDate: dto.lrDate,
        notes: dto.notes,
        items,
      });

      const saved = await manager.save(PurchaseReceipt, receipt);

      // Save items with receipt reference
      items.forEach((item) => {
        item.purchaseReceiptId = saved.id;
      });
      await manager.save(PurchaseReceiptItem, items);

      // Return with items loaded
      return manager.findOne(PurchaseReceipt, {
        where: { id: saved.id },
        relations: ['items', 'supplier', 'purchaseOrder'],
      });
    });
  }

  /**
   * Find all receipts for an organization
   */
  async findAll(organizationId: string): Promise<PurchaseReceipt[]> {
    return this.purchaseReceiptRepository.find({
      where: { organizationId },
      relations: ['supplier', 'purchaseOrder', 'items'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find receipt by ID with organization check
   */
  async findOne(
    organizationId: string,
    id: string,
  ): Promise<PurchaseReceipt | null> {
    return this.purchaseReceiptRepository.findOne({
      where: { id, organizationId },
      relations: ['supplier', 'purchaseOrder', 'items'],
    });
  }

  /**
   * Update receipt status with workflow validation
   * Following ERPNext state machine and stock integration
   */
  async updateStatus(
    organizationId: string,
    id: string,
    userId: number,
    ctx: RequestContext,
    dto: UpdatePurchaseReceiptStatusDto,
  ): Promise<PurchaseReceipt> {
    const receipt = await this.findOne(organizationId, id);
    if (!receipt) {
      throw new NotFoundException(`Purchase receipt not found`);
    }

    // Validate status transition
    this.validateStatusTransition(receipt.status, dto.status);

    return this.dataSource.transaction(async (manager) => {
      receipt.status = dto.status;

      // SUBMITTED: Post stock and update PO
      if (dto.status === PurchaseReceiptStatus.SUBMITTED) {
        if (receipt.stockPosted) {
          throw new BadRequestException(
            'Stock already posted for this receipt',
          );
        }

        // Post stock movements for each item
        for (const item of receipt.items) {
          await this.stockService.receiveStock(
            {
              pharmacyId: receipt.pharmacyId,
              drugId: item.drugId,
              quantity: item.stockQuantity, // Use stock quantity (base UOM)
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
              costPrice: item.unitPrice,
              reason: `Purchase Receipt ${receipt.code}`,
              referenceType: 'PURCHASE_RECEIPT',
              referenceId: receipt.id,
            },
            userId,
            ctx,
          );
        }

        receipt.stockPosted = true;
        receipt.docStatus = 1; // Submitted
        receipt.submittedAt = new Date();
        receipt.submittedBy = String(userId);

        // Update PO received quantities if linked
        if (receipt.purchaseOrderId) {
          await this.updatePurchaseOrderProgress(
            manager,
            receipt.purchaseOrderId,
            receipt.items,
          );
        }
      } else if (dto.status === PurchaseReceiptStatus.CANCELLED) {
        if (!receipt.stockPosted) {
          throw new BadRequestException(
            'Cannot cancel receipt that has not been submitted',
          );
        }

        // Reverse stock movements
        for (const item of receipt.items) {
          await this.stockService.adjustStock(
            {
              pharmacyId: receipt.pharmacyId,
              drugId: item.drugId,
              batchNumber: item.batchNumber,
              quantityChange: -item.stockQuantity, // Negative to reverse
              reason: `Cancelled Purchase Receipt ${receipt.code}`,
              referenceType: 'PURCHASE_RECEIPT_CANCELLATION',
              referenceId: receipt.id,
            },
            userId,
            ctx,
          );
        }

        receipt.docStatus = 2; // Cancelled
        receipt.cancelledAt = new Date();

        // Update PO received quantities (reverse)
        if (receipt.purchaseOrderId) {
          await this.updatePurchaseOrderProgress(
            manager,
            receipt.purchaseOrderId,
            receipt.items,
            true, // reverse
          );
        }
      }

      if (dto.notes) {
        receipt.notes = dto.notes;
      }

      await manager.save(PurchaseReceipt, receipt);

      return manager.findOne(PurchaseReceipt, {
        where: { id },
        relations: ['supplier', 'purchaseOrder', 'items'],
      });
    });
  }

  /**
   * Update PO item received quantities and overall progress
   */
  private async updatePurchaseOrderProgress(
    manager: any,
    purchaseOrderId: string,
    receiptItems: PurchaseReceiptItem[],
    reverse: boolean = false,
  ): Promise<void> {
    for (const receiptItem of receiptItems) {
      if (receiptItem.purchaseOrderItemId) {
        const poItem = await manager.findOne(PurchaseOrderItem, {
          where: { id: receiptItem.purchaseOrderItemId },
        });

        if (poItem) {
          const changeQty = reverse
            ? -receiptItem.stockQuantity
            : receiptItem.stockQuantity;

          poItem.receivedQuantity =
            Number(poItem.receivedQuantity) + changeQty;

          await manager.save(PurchaseOrderItem, poItem);
        }
      }
    }

    // Update PO overall received percentage
    await this.purchaseOrderService.updateReceivedPercentage(purchaseOrderId);
  }

  /**
   * Validate status transitions following ERPNext workflow
   */
  private validateStatusTransition(
    currentStatus: PurchaseReceiptStatus,
    newStatus: PurchaseReceiptStatus,
  ): void {
    const validTransitions: Record<
      PurchaseReceiptStatus,
      PurchaseReceiptStatus[]
    > = {
      [PurchaseReceiptStatus.DRAFT]: [
        PurchaseReceiptStatus.SUBMITTED,
        PurchaseReceiptStatus.CANCELLED,
      ],
      [PurchaseReceiptStatus.SUBMITTED]: [
        PurchaseReceiptStatus.COMPLETED,
        PurchaseReceiptStatus.CANCELLED,
      ],
      [PurchaseReceiptStatus.COMPLETED]: [],
      [PurchaseReceiptStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Delete a DRAFT purchase receipt
   * Following ERPNext: only drafts can be deleted
   */
  async remove(organizationId: string, id: string): Promise<void> {
    const receipt = await this.findOne(organizationId, id);
    if (!receipt) {
      throw new NotFoundException(`Purchase receipt not found`);
    }

    if (receipt.status !== PurchaseReceiptStatus.DRAFT) {
      throw new ForbiddenException(
        'Only DRAFT purchase receipts can be deleted',
      );
    }

    await this.purchaseReceiptRepository.remove(receipt);
  }
}
