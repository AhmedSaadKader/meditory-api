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

export enum CustomerType {
  WALK_IN = 'WALK_IN', // Anonymous walk-in customer
  REGISTERED = 'REGISTERED', // Registered customer with code
  INSURANCE = 'INSURANCE', // Customer with insurance coverage
  CREDIT = 'CREDIT', // Customer with credit terms
}

/**
 * Customer entity (ERPNext + Vendure hybrid)
 * Supports both walk-in customers and registered customers
 */
@Entity({ schema: 'operational', name: 'customers' })
@Index(['organizationId', 'code'], { unique: true, where: '"code" IS NOT NULL' }) // Code unique per organization (when present)
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Multi-tenancy
  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // Customer Info
  @Column({ length: 100, nullable: true })
  code?: string; // Only for registered customers (e.g., CUST-001)

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ length: 50, nullable: true })
  phone?: string;

  @Column({ length: 100, nullable: true })
  email?: string;

  // Customer Type
  @Column({
    type: 'enum',
    enum: CustomerType,
    default: CustomerType.WALK_IN,
  })
  type: CustomerType;

  // Financial (for CREDIT customers)
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    name: 'current_balance',
  })
  currentBalance: number; // Accounts Receivable balance (what customer owes us)

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    name: 'credit_limit',
  })
  creditLimit?: number;

  // Insurance Info (for INSURANCE customers)
  @Column({ length: 100, nullable: true, name: 'insurance_provider' })
  insuranceProvider?: string;

  @Column({ length: 100, nullable: true, name: 'insurance_policy_number' })
  insurancePolicyNumber?: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'insurance_coverage_percentage',
  })
  insuranceCoveragePercentage?: number; // e.g., 80 means 80% covered by insurance

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

  // Relations will be added when SalesInvoice entity is created
  // @OneToMany(() => SalesInvoice, (invoice) => invoice.customer)
  // salesInvoices: SalesInvoice[];
}
