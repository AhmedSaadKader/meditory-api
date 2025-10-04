import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  raw_name: string;

  @Column({ type: 'text', nullable: true })
  standard_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  administration_type: string;

  @Column({ type: 'text', array: true, nullable: true })
  synonyms: string[];

  @Column({ type: 'boolean', default: false })
  is_standardized: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
