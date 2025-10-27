import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Pharmacy } from '../../inventory/entities/pharmacy.entity';
import { Organization } from './organization.entity';

@Entity({ schema: 'operational', name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn({ name: 'role_id' })
  roleId: number;

  @ManyToOne(() => Organization, (organization) => organization.roles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', array: true })
  permissions: string[];

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @ManyToMany(() => Pharmacy)
  @JoinTable({
    name: 'role_pharmacies',
    schema: 'operational',
    joinColumn: { name: 'role_id', referencedColumnName: 'roleId' },
    inverseJoinColumn: { name: 'pharmacy_id', referencedColumnName: 'id' },
  })
  pharmacies: Pharmacy[];

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
