import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Pharmacy } from './pharmacy.entity';

export enum StockMovementType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN_FROM_CUSTOMER = 'RETURN_FROM_CUSTOMER',
  RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER',
  EXPIRY = 'EXPIRY',
  DAMAGE = 'DAMAGE',
  RECALL = 'RECALL',
  TRANSFER_OUT = 'TRANSFER_OUT',
  TRANSFER_IN = 'TRANSFER_IN',
  ALLOCATION = 'ALLOCATION',
  RELEASE = 'RELEASE',
  STOCK_TAKE = 'STOCK_TAKE',
}

@Entity({ schema: 'operational', name: 'stock_movements' })
@Index(['pharmacyId', 'drugId', 'createdAt'])
@Index(['batchNumber', 'createdAt'])
@Index(['type', 'createdAt'])
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: StockMovementType,
  })
  type: StockMovementType;

  @ManyToOne(() => Pharmacy)
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy: Pharmacy;

  @Column({ name: 'pharmacy_id' })
  pharmacyId: string;

  @Column({ name: 'drug_id' })
  drugId: number;

  @Column({ name: 'batch_number' })
  batchNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'balance_after' })
  balanceAfter: number;

  @Column({ nullable: true, name: 'reference_type' })
  referenceType: string;

  @Column({ nullable: true, name: 'reference_id' })
  referenceId: string;

  @Column({ nullable: true, name: 'reference_number' })
  referenceNumber: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true, name: 'user_id' })
  userId: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true, name: 'related_pharmacy_id' })
  relatedPharmacyId: string;

  @Column({ nullable: true, name: 'related_movement_id' })
  relatedMovementId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
