import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ schema: 'operational', name: 'sessions' })
export class Session {
  @PrimaryGeneratedColumn({ name: 'session_id' })
  sessionId: number;

  @Column({ unique: true, length: 100 })
  token: string;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'authentication_strategy' })
  authenticationStrategy: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'invalidated_at', type: 'timestamp', nullable: true })
  invalidatedAt: Date | null;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

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

  // Helper methods
  isValid(): boolean {
    return this.invalidatedAt === null && this.expiresAt > new Date();
  }

  invalidate(): void {
    this.invalidatedAt = new Date();
  }
}
