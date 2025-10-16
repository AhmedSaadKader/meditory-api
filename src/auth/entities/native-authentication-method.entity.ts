import { ChildEntity, Column } from 'typeorm';
import { AuthenticationMethod } from './authentication-method.entity';

@ChildEntity('native')
export class NativeAuthenticationMethod extends AuthenticationMethod {
  @Column({ nullable: true })
  identifier: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({ name: 'verification_token', nullable: true })
  verificationToken: string | null;

  @Column({ name: 'password_reset_token', nullable: true })
  passwordResetToken: string | null;

  @Column({ name: 'identifier_change_token', nullable: true })
  identifierChangeToken: string | null;

  @Column({ name: 'pending_identifier', nullable: true })
  pendingIdentifier: string | null;
}
