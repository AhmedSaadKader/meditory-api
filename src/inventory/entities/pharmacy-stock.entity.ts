import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Pharmacy } from './pharmacy.entity';

@Entity({ schema: 'operational', name: 'pharmacy_stock' })
@Index(['pharmacyId', 'drugId', 'batchNumber'], { unique: true })
export class PharmacyStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Pharmacy)
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy: Pharmacy;

  @Column({ name: 'pharmacy_id' })
  @Index()
  pharmacyId: string;

  @Column({ name: 'drug_id' })
  @Index()
  drugId: number;

  @Column({ name: 'batch_number' })
  batchNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'allocated_quantity',
  })
  allocatedQuantity: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'minimum_stock_level',
  })
  minimumStockLevel: number;

  @Column({ type: 'date', nullable: true, name: 'expiry_date' })
  expiryDate: Date;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'cost_price',
  })
  costPrice: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'selling_price',
  })
  sellingPrice: number;

  @Column({ nullable: true, name: 'supplier_name' })
  supplierName: string;

  @Column({ nullable: true, name: 'supplier_invoice_number' })
  supplierInvoiceNumber: string;

  @Column({ type: 'date', nullable: true, name: 'received_date' })
  receivedDate: Date;

  @Column({ default: false, name: 'is_quarantined' })
  isQuarantined: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
