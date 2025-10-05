import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('dosage_forms')
export class DosageForm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  raw_name: string;

  @Column({ type: 'text', nullable: true })
  standard_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  pharmaceutical_category: string;

  @Column({ type: 'text', array: true, nullable: true })
  synonyms: string[];

  @Column({ type: 'boolean', default: false })
  is_standardized: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
