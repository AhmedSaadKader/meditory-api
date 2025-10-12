import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ schema: 'reference', name: 'drugs' })
export class Drug {
  @PrimaryGeneratedColumn()
  drug_id: number;

  @Column({ nullable: true })
  original_id: number;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  oldprice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'text', nullable: true })
  active_raw: string;

  @Column({ type: 'text', nullable: true })
  img: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  company: string;

  @Column({ type: 'text', nullable: true })
  dosage_form: string;

  @Column({ nullable: true })
  units: number;

  @Column({ type: 'text', nullable: true })
  barcode: string;

  @Column({ type: 'text', nullable: true })
  route: string;

  @Column({ type: 'text', nullable: true })
  pharmacology: string;

  @Column({ nullable: true })
  sold_times: number;

  @Column({ type: 'bigint', nullable: true })
  date_updated: number;

  @Column({ nullable: true })
  cosmo: number;

  @CreateDateColumn()
  created_at: Date;
}
