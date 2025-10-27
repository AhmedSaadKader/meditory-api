import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';
import { Pharmacy } from '../../inventory/entities/pharmacy.entity';

@Entity({ schema: 'operational', name: 'organizations' })
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ unique: true, length: 100 })
  token: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  settings: Record<string, any>;

  // Relationships
  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToMany(() => Role, (role) => role.organization)
  roles: Role[];

  @OneToMany(() => Pharmacy, (pharmacy) => pharmacy.organization)
  pharmacies: Pharmacy[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  isActiveOrganization(): boolean {
    return this.isActive;
  }

  deactivate(): void {
    this.isActive = false;
  }

  activate(): void {
    this.isActive = true;
  }
}
