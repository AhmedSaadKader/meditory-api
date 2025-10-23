import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { AuthenticationMethod } from './authentication-method.entity';
import { Session } from './session.entity';
import { Role } from './role.entity';
import { NativeAuthenticationMethod } from './native-authentication-method.entity';

@Entity({ schema: 'operational', name: 'users' })
export class User {
  @PrimaryGeneratedColumn({ name: 'user_id' })
  userId: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  username: string;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

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

  // Relationships
  @OneToMany(() => AuthenticationMethod, (method) => method.user)
  authenticationMethods: AuthenticationMethod[];

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'userId' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'roleId' },
  })
  roles: Role[];

  // Helper methods
  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  softDelete(): void {
    this.deletedAt = new Date();
  }

  restore(): void {
    this.deletedAt = null;
  }

  getNativeAuthenticationMethod(): NativeAuthenticationMethod | undefined {
    return this.authenticationMethods?.find(
      (m) => m.type === 'native',
    ) as NativeAuthenticationMethod;
  }
}
