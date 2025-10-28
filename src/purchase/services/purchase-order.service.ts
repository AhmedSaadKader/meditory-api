import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
} from '../entities/purchase-order.entity';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { UpdatePurchaseOrderStatusDto } from '../dto/update-purchase-order-status.dto';

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private purchaseOrderItemRepository: Repository<PurchaseOrderItem>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a new purchase order in DRAFT status
   * Following ERPNext pattern: all POs start as drafts
   */
  async create(
    organizationId: string,
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    return this.dataSource.transaction(async (manager) => {
      // Check if code is unique within organization
      const existing = await manager.findOne(PurchaseOrder, {
        where: { organizationId, code: dto.code },
      });

      if (existing) {
        throw new BadRequestException(
          `Purchase order with code "${dto.code}" already exists`,
        );
      }

      // Calculate totals
      let subtotal = 0;
      let totalTax = 0;
      let totalQuantity = 0;

      const items = dto.items.map((itemDto) => {
        const amount = itemDto.quantity * itemDto.unitPrice;
        const taxRate = itemDto.taxRate || 0;
        const taxAmount = (amount * taxRate) / 100;

        subtotal += amount;
        totalTax += taxAmount;
        totalQuantity += itemDto.quantity;

        const item = manager.create(PurchaseOrderItem, {
          drugId: itemDto.drugId,
          quantity: itemDto.quantity,
          unitPrice: itemDto.unitPrice,
          amount,
          taxRate,
          taxAmount,
          expectedDeliveryDate: itemDto.expectedDeliveryDate,
          uom: itemDto.uom || 'Unit',
          conversionFactor: itemDto.conversionFactor || 1,
          stockUom: itemDto.stockUom || 'Unit',
          description: itemDto.description,
        });

        return item;
      });

      const grandTotal = subtotal + totalTax;

      // Create PO
      const purchaseOrder = manager.create(PurchaseOrder, {
        organizationId,
        code: dto.code,
        supplierId: dto.supplierId,
        status: PurchaseOrderStatus.DRAFT,
        docStatus: 0, // Draft
        orderDate: dto.orderDate,
        expectedDeliveryDate: dto.expectedDeliveryDate,
        pharmacyId: dto.pharmacyId,
        totalQuantity,
        subtotal,
        totalTax,
        grandTotal,
        termsAndConditions: dto.termsAndConditions,
        notes: dto.notes,
        items,
      });

      const saved = await manager.save(PurchaseOrder, purchaseOrder);

      // Save items with PO reference
      items.forEach((item) => {
        item.purchaseOrderId = saved.id;
      });
      await manager.save(PurchaseOrderItem, items);

      // Return with items loaded
      const result = await manager.findOne(PurchaseOrder, {
        where: { id: saved.id },
        relations: ['items', 'supplier'],
      });

      if (!result) {
        throw new Error('Failed to create purchase order');
      }

      return result;
    });
  }

  /**
   * Find all POs for an organization
   */
  async findAll(organizationId: string): Promise<PurchaseOrder[]> {
    return this.purchaseOrderRepository.find({
      where: { organizationId },
      relations: ['supplier', 'items'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find PO by ID with organization check
   */
  async findOne(
    organizationId: string,
    id: string,
  ): Promise<PurchaseOrder | null> {
    return this.purchaseOrderRepository.findOne({
      where: { id, organizationId },
      relations: ['supplier', 'items'],
    });
  }

  /**
   * Find PO by code
   */
  async findByCode(
    organizationId: string,
    code: string,
  ): Promise<PurchaseOrder | null> {
    return this.purchaseOrderRepository.findOne({
      where: { organizationId, code },
      relations: ['supplier', 'items'],
    });
  }

  /**
   * Update a DRAFT purchase order
   * Following ERPNext: only drafts can be updated
   */
  async update(
    organizationId: string,
    id: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const po = await this.findOne(organizationId, id);
    if (!po) {
      throw new NotFoundException(`Purchase order not found`);
    }

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new ForbiddenException(
        'Only DRAFT purchase orders can be updated. Use amendment for submitted orders.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // If items are being updated, recalculate totals
      if (dto.items) {
        // Delete old items
        await manager.delete(PurchaseOrderItem, { purchaseOrderId: id });

        // Calculate new totals
        let subtotal = 0;
        let totalTax = 0;
        let totalQuantity = 0;

        const items = dto.items.map((itemDto) => {
          const amount = itemDto.quantity * itemDto.unitPrice;
          const taxRate = itemDto.taxRate || 0;
          const taxAmount = (amount * taxRate) / 100;

          subtotal += amount;
          totalTax += taxAmount;
          totalQuantity += itemDto.quantity;

          return manager.create(PurchaseOrderItem, {
            purchaseOrderId: id,
            drugId: itemDto.drugId,
            quantity: itemDto.quantity,
            unitPrice: itemDto.unitPrice,
            amount,
            taxRate,
            taxAmount,
            expectedDeliveryDate: itemDto.expectedDeliveryDate,
            uom: itemDto.uom || 'Unit',
            conversionFactor: itemDto.conversionFactor || 1,
            stockUom: itemDto.stockUom || 'Unit',
            description: itemDto.description,
          });
        });

        await manager.save(PurchaseOrderItem, items);

        po.totalQuantity = totalQuantity;
        po.subtotal = subtotal;
        po.totalTax = totalTax;
        po.grandTotal = subtotal + totalTax;
      }

      // Update other fields
      Object.assign(po, {
        supplierId: dto.supplierId ?? po.supplierId,
        orderDate: dto.orderDate ?? po.orderDate,
        expectedDeliveryDate: dto.expectedDeliveryDate ?? po.expectedDeliveryDate,
        pharmacyId: dto.pharmacyId ?? po.pharmacyId,
        termsAndConditions: dto.termsAndConditions ?? po.termsAndConditions,
        notes: dto.notes ?? po.notes,
      });

      await manager.save(PurchaseOrder, po);

      const result = await manager.findOne(PurchaseOrder, {
        where: { id },
        relations: ['supplier', 'items'],
      });

      if (!result) {
        throw new Error('Failed to update purchase order');
      }

      return result;
    });
  }

  /**
   * Update PO status with workflow validation
   * Following ERPNext state machine
   */
  async updateStatus(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdatePurchaseOrderStatusDto,
  ): Promise<PurchaseOrder> {
    const po = await this.findOne(organizationId, id);
    if (!po) {
      throw new NotFoundException(`Purchase order not found`);
    }

    // Validate status transition
    this.validateStatusTransition(po.status, dto.status);

    return this.dataSource.transaction(async (manager) => {
      po.status = dto.status;

      // Update docStatus based on new status
      if (dto.status === PurchaseOrderStatus.SUBMITTED) {
        po.docStatus = 1; // Submitted
        po.submittedAt = new Date();
        po.submittedBy = userId;
      } else if (dto.status === PurchaseOrderStatus.CANCELLED) {
        po.docStatus = 2; // Cancelled
        po.cancelledAt = new Date();
      }

      if (dto.notes) {
        po.notes = dto.notes;
      }

      await manager.save(PurchaseOrder, po);

      const result = await manager.findOne(PurchaseOrder, {
        where: { id },
        relations: ['supplier', 'items'],
      });

      if (!result) {
        throw new Error('Failed to update purchase order status');
      }

      return result;
    });
  }

  /**
   * Validate status transitions following ERPNext workflow
   */
  private validateStatusTransition(
    currentStatus: PurchaseOrderStatus,
    newStatus: PurchaseOrderStatus,
  ): void {
    const validTransitions: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> =
      {
        [PurchaseOrderStatus.DRAFT]: [
          PurchaseOrderStatus.SUBMITTED,
          PurchaseOrderStatus.CANCELLED,
        ],
        [PurchaseOrderStatus.SUBMITTED]: [
          PurchaseOrderStatus.PARTIALLY_RECEIVED,
          PurchaseOrderStatus.RECEIVED,
          PurchaseOrderStatus.CANCELLED,
          PurchaseOrderStatus.CLOSED,
        ],
        [PurchaseOrderStatus.PARTIALLY_RECEIVED]: [
          PurchaseOrderStatus.RECEIVED,
          PurchaseOrderStatus.CANCELLED,
          PurchaseOrderStatus.CLOSED,
        ],
        [PurchaseOrderStatus.RECEIVED]: [
          PurchaseOrderStatus.COMPLETED,
          PurchaseOrderStatus.CLOSED,
        ],
        [PurchaseOrderStatus.COMPLETED]: [],
        [PurchaseOrderStatus.CANCELLED]: [],
        [PurchaseOrderStatus.CLOSED]: [],
      };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Update received percentage when purchase receipts are created
   * Called by PurchaseReceiptService
   */
  async updateReceivedPercentage(
    purchaseOrderId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const po = await manager.findOne(PurchaseOrder, {
        where: { id: purchaseOrderId },
        relations: ['items'],
      });

      if (!po) return;

      // Calculate received percentage
      let totalOrdered = 0;
      let totalReceived = 0;

      for (const item of po.items) {
        totalOrdered += Number(item.quantity);
        totalReceived += Number(item.receivedQuantity);
      }

      const receivedPercentage =
        totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;

      po.receivedPercentage = receivedPercentage;

      // Auto-update status based on received percentage
      if (receivedPercentage >= 100 && po.status === PurchaseOrderStatus.SUBMITTED) {
        po.status = PurchaseOrderStatus.RECEIVED;
      } else if (
        receivedPercentage > 0 &&
        receivedPercentage < 100 &&
        po.status === PurchaseOrderStatus.SUBMITTED
      ) {
        po.status = PurchaseOrderStatus.PARTIALLY_RECEIVED;
      }

      await manager.save(PurchaseOrder, po);
    });
  }

  /**
   * Delete a DRAFT purchase order
   * Following ERPNext: only drafts can be deleted
   */
  async remove(organizationId: string, id: string): Promise<void> {
    const po = await this.findOne(organizationId, id);
    if (!po) {
      throw new NotFoundException(`Purchase order not found`);
    }

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new ForbiddenException('Only DRAFT purchase orders can be deleted');
    }

    await this.purchaseOrderRepository.remove(po);
  }
}
