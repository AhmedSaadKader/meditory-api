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

/**
 * Purchase Order Status following ERPNext workflow
 * Draft -> Submitted -> (Partially Received) -> Received -> Completed/Cancelled
 */
export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT', // Being edited, not yet submitted
  SUBMITTED = 'SUBMITTED', // Submitted to supplier, awaiting delivery
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED', // Some items received
  RECEIVED = 'RECEIVED', // All items received
  COMPLETED = 'COMPLETED', // Fully invoiced and closed
  CANCELLED = 'CANCELLED', // Order cancelled
  CLOSED = 'CLOSED', // Manually closed before completion
}

/**
 * Purchase Order entity following ERPNext schema
 * Maps to ERPNext's Purchase Order DocType
 */
@Entity({ schema: 'operational', name: 'purchase_orders' })
@Index(['organizationId', 'code'], { unique: true })
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  /**
   * PO Number/Code (e.g., "PO-2025-001")
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
   * ERPNext field: status
   */
  @Column({
    type: 'enum',
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.DRAFT,
  })
  @Index()
  status: PurchaseOrderStatus;

  /**
   * ERPNext field: transaction_date
   */
  @Column({ type: 'date', name: 'order_date' })
  orderDate: Date;

  /**
   * ERPNext field: schedule_date (expected delivery date)
   */
  @Column({ type: 'date', name: 'expected_delivery_date', nullable: true })
  expectedDeliveryDate?: Date;

  /**
   * Target pharmacy for delivery
   * Pharmacy-specific addition (NOT in ERPNext)
   */
  @Column({ name: 'pharmacy_id', nullable: true })
  @Index()
  pharmacyId?: string;

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
   * ERPNext field: total (before taxes and charges)
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
   * Track how much has been received against this PO
   * Calculated from PurchaseReceipts
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'received_percentage',
    default: 0,
  })
  receivedPercentage: number;

  /**
   * Track how much has been invoiced against this PO
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
   * ERPNext field: tc_name (terms and conditions template name)
   */
  @Column({ type: 'text', nullable: true, name: 'terms_and_conditions' })
  termsAndConditions?: string;

  /**
   * ERPNext field: remarks
   */
  @Column({ type: 'text', nullable: true })
  notes?: string;

  /**
   * ERPNext field: amended_from
   * Reference to original PO if this is an amendment
   */
  @Column({ name: 'amended_from_id', nullable: true })
  amendedFromId?: string;

  @ManyToOne(() => PurchaseOrder, { nullable: true })
  @JoinColumn({ name: 'amended_from_id' })
  amendedFrom?: PurchaseOrder;

  /**
   * User who submitted the order
   */
  @Column({ name: 'submitted_by', nullable: true })
  submittedBy?: string;

  /**
   * ERPNext field: docstatus
   * 0 = Draft, 1 = Submitted, 2 = Cancelled
   */
  @Column({ type: 'int', default: 0, name: 'doc_status' })
  docStatus: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'submitted_at' })
  submittedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'cancelled_at' })
  cancelledAt?: Date;

  // Relations
  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, {
    cascade: true,
  })
  items: PurchaseOrderItem[];
}

/**
 * Purchase Order Item entity following ERPNext schema
 * Maps to ERPNext's Purchase Order Item DocType
 */
@Entity({ schema: 'operational', name: 'purchase_order_items' })
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'purchase_order_id' })
  @Index()
  purchaseOrderId: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  /**
   * ERPNext field: item_code
   */
  @Column({ name: 'drug_id' })
  @Index()
  drugId: string;

  /**
   * ERPNext field: qty
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
   * ERPNext field: received_qty
   */
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'received_quantity',
    default: 0,
  })
  receivedQuantity: number;

  /**
   * ERPNext field: billed_qty (invoiced quantity)
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
   * ERPNext field: schedule_date (expected delivery for this item)
   */
  @Column({ type: 'date', name: 'expected_delivery_date', nullable: true })
  expectedDeliveryDate?: Date;

  /**
   * ERPNext field: uom (Unit of Measurement)
   * Usually "Unit", "Box", "Strip" for pharmacy
   */
  @Column({ length: 50, default: 'Unit' })
  uom: string;

  /**
   * ERPNext field: conversion_factor
   * How many base units in one UOM (e.g., 10 tablets per strip)
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
   * ERPNext field: stock_uom (base unit for inventory)
   */
  @Column({ length: 50, name: 'stock_uom', default: 'Unit' })
  stockUom: string;

  /**
   * ERPNext field: item_tax_template
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
   * ERPNext field: description
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
