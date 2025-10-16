import { ChildEntity, Column } from 'typeorm';
import { AuthenticationMethod } from './authentication-method.entity';

@ChildEntity('native')
export class NativeAuthenticationMethod extends AuthenticationMethod {
  @Column({ type: 'varchar', nullable: true })
  identifier: string;

  @Column({ type: 'varchar', name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({ type: 'varchar', name: 'verification_token', nullable: true })
  verificationToken: string | null;

  @Column({ type: 'varchar', name: 'password_reset_token', nullable: true })
  passwordResetToken: string | null;

  @Column({ type: 'varchar', name: 'identifier_change_token', nullable: true })
  identifierChangeToken: string | null;

  @Column({ type: 'varchar', name: 'pending_identifier', nullable: true })
  pendingIdentifier: string | null;
}
