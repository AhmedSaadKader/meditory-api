import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  TableInheritance,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ schema: 'operational', name: 'authentication_methods' })
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class AuthenticationMethod {
  @PrimaryGeneratedColumn({ name: 'auth_method_id' })
  authMethodId: number;

  @Column()
  type: string;

  @ManyToOne(() => User, (user) => user.authenticationMethods, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

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
