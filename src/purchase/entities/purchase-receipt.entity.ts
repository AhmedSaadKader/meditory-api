import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';
import { PurchaseOrder } from './purchase-order.entity';

/**
 * Purchase Receipt Status following ERPNext workflow
 * Draft -> Submitted -> Completed
 */
export enum PurchaseReceiptStatus {
  DRAFT = 'DRAFT', // Being edited, not yet submitted
  SUBMITTED = 'SUBMITTED', // Submitted and stock received
  COMPLETED = 'COMPLETED', // Fully invoiced
  CANCELLED = 'CANCELLED', // Receipt cancelled (stock reversed)
}

/**
 * Purchase Receipt entity following ERPNext schema
 * Maps to ERPNext's Purchase Receipt DocType
 * Represents goods received from supplier
 */
@Entity({ schema: 'operational', name: 'purchase_receipts' })
@Index(['organizationId', 'code'], { unique: true })
export class PurchaseReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  /**
   * Receipt Number/Code (e.g., "PR-2025-001")
   * ERPNext field: name
   */
  @Column({ length: 100 })
  code: string;

  /**
   * ERPNext field: supplier
   */
  @Column({ name: 'supplier_id' })
  @Index()
  supplierId: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  /**
   * Reference to originating purchase order
   * ERPNext: items have purchase_order reference
   */
  @Column({ name: 'purchase_order_id', nullable: true })
  @Index()
  purchaseOrderId?: string;

  @ManyToOne(() => PurchaseOrder, { nullable: true })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder?: PurchaseOrder;

  /**
   * ERPNext field: status
   */
  @Column({
    type: 'enum',
    enum: PurchaseReceiptStatus,
    default: PurchaseReceiptStatus.DRAFT,
  })
  @Index()
  status: PurchaseReceiptStatus;

  /**
   * ERPNext field: posting_date
   */
  @Column({ type: 'date', name: 'posting_date' })
  postingDate: Date;

  /**
   * Target pharmacy receiving the goods
   * Required for stock movement
   */
  @Column({ name: 'pharmacy_id' })
  @Index()
  pharmacyId: string;

  /**
   * ERPNext field: total_qty
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_quantity',
    default: 0,
  })
  totalQuantity: number;

  /**
   * ERPNext field: total (before taxes)
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'subtotal',
    default: 0,
  })
  subtotal: number;

  /**
   * ERPNext field: total_taxes_and_charges
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'total_tax',
    default: 0,
  })
  totalTax: number;

  /**
   * ERPNext field: grand_total
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'grand_total',
    default: 0,
  })
  grandTotal: number;

  /**
   * Track how much has been invoiced against this receipt
   * Calculated from PurchaseInvoices
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'invoiced_percentage',
    default: 0,
  })
  invoicedPercentage: number;

  /**
   * ERPNext field: remarks
   */
  @Column({ type: 'text', nullable: true })
  notes?: string;

  /**
   * Delivery note reference from supplier
   * ERPNext field: supplier_delivery_note
   */
  @Column({ length: 255, nullable: true, name: 'supplier_delivery_note' })
  supplierDeliveryNote?: string;

  /**
   * ERPNext field: lr_no (Logistics Receipt Number)
   */
  @Column({ length: 100, nullable: true, name: 'lr_no' })
  lrNo?: string;

  /**
   * ERPNext field: lr_date
   */
  @Column({ type: 'date', nullable: true, name: 'lr_date' })
  lrDate?: Date;

  /**
   * User who submitted the receipt
   */
  @Column({ name: 'submitted_by', nullable: true })
  submittedBy?: string;

  /**
   * ERPNext field: docstatus
   * 0 = Draft, 1 = Submitted, 2 = Cancelled
   */
  @Column({ type: 'int', default: 0, name: 'doc_status' })
  docStatus: number;

  /**
   * Whether stock movements have been created
   * Internal field for ensuring idempotency
   */
  @Column({ default: false, name: 'stock_posted' })
  stockPosted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'submitted_at' })
  submittedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'cancelled_at' })
  cancelledAt?: Date;

  // Relations
  @OneToMany(() => PurchaseReceiptItem, (item) => item.purchaseReceipt, {
    cascade: true,
  })
  items: PurchaseReceiptItem[];
}

/**
 * Purchase Receipt Item entity following ERPNext schema
 * Maps to ERPNext's Purchase Receipt Item DocType
 */
@Entity({ schema: 'operational', name: 'purchase_receipt_items' })
export class PurchaseReceiptItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'purchase_receipt_id' })
  @Index()
  purchaseReceiptId: string;

  @ManyToOne(() => PurchaseReceipt, (pr) => pr.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_receipt_id' })
  purchaseReceipt: PurchaseReceipt;

  /**
   * Reference to PO item if this receipt is against a PO
   * ERPNext field: purchase_order_item
   */
  @Column({ name: 'purchase_order_item_id', nullable: true })
  purchaseOrderItemId?: string;

  /**
   * ERPNext field: item_code
   */
  @Column({ name: 'drug_id' })
  @Index()
  drugId: number;

  /**
   * ERPNext field: qty (received quantity)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  quantity: number;

  /**
   * ERPNext field: rate (unit price)
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'unit_price',
  })
  unitPrice: number;

  /**
   * ERPNext field: amount (qty * rate)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  /**
   * ERPNext field: batch_no
   * Critical for pharmacy inventory tracking
   */
  @Column({ length: 100, name: 'batch_number' })
  batchNumber: string;

  /**
   * ERPNext field: expiry_date
   * Critical for pharmacy compliance
   */
  @Column({ type: 'date', name: 'expiry_date' })
  expiryDate: Date;

  /**
   * ERPNext field: uom (Unit of Measurement)
   */
  @Column({ length: 50, default: 'Unit' })
  uom: string;

  /**
   * ERPNext field: conversion_factor
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    name: 'conversion_factor',
    default: 1,
  })
  conversionFactor: number;

  /**
   * ERPNext field: stock_uom
   */
  @Column({ length: 50, name: 'stock_uom', default: 'Unit' })
  stockUom: string;

  /**
   * Stock quantity in base UOM (qty * conversion_factor)
   * ERPNext field: stock_qty
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'stock_quantity',
  })
  stockQuantity: number;

  /**
   * Tax rate for this item
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'tax_rate',
    default: 0,
  })
  taxRate: number;

  /**
   * Tax amount for this line item
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'tax_amount',
    default: 0,
  })
  taxAmount: number;

  /**
   * How much of this item has been invoiced
   * ERPNext field: billed_qty
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'invoiced_quantity',
    default: 0,
  })
  invoicedQuantity: number;

  /**
   * ERPNext field: description
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
