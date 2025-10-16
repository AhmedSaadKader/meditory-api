import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';

@Entity({ schema: 'operational', name: 'user_roles' })
@Unique(['userId', 'roleId'])
export class UserRole {
  @PrimaryGeneratedColumn({ name: 'user_role_id' })
  userRoleId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'role_id' })
  roleId: number;

  @Column({
    name: 'assigned_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  assignedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_by_user_id' })
  assignedBy: User;

  @Column({ name: 'assigned_by_user_id', nullable: true })
  assignedByUserId: number | null;
}
