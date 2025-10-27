import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../auth/entities/organization.entity';

export enum SupplierType {
  COMPANY = 'COMPANY',
  INDIVIDUAL = 'INDIVIDUAL',
  PARTNERSHIP = 'PARTNERSHIP',
}

/**
 * Supplier entity (ERPNext-inspired)
 * Tracks suppliers for purchase orders
 */
@Entity({ schema: 'operational', name: 'suppliers' })
@Index(['organizationId', 'code'], { unique: true }) // Code unique per organization
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Multi-tenancy
  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // Supplier Info
  @Column({ length: 100 })
  code: string; // Unique within organization (e.g., SUP-001)

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ length: 50, nullable: true })
  phone?: string;

  @Column({ length: 100, nullable: true })
  email?: string;

  @Column({ length: 100, nullable: true })
  contactPerson?: string;

  // Supplier Type (ERPNext field)
  @Column({
    type: 'enum',
    enum: SupplierType,
    default: SupplierType.COMPANY,
    name: 'supplier_type',
  })
  supplierType: SupplierType;

  // Financial
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    name: 'current_balance',
  })
  currentBalance: number; // Accounts Payable balance (what we owe supplier)

  @Column({ type: 'simple-json', nullable: true, name: 'payment_terms' })
  paymentTerms?: {
    creditDays?: number; // Net 30, Net 60, etc.
    discountPercentage?: number; // Early payment discount (e.g., 2%)
    discountDays?: number; // Discount if paid within days (e.g., 10 days)
  };

  // Status
  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations will be added when PurchaseOrder entity is created
  // @OneToMany(() => PurchaseOrder, (po) => po.supplier)
  // purchaseOrders: PurchaseOrder[];
}
