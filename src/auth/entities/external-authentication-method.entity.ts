import { ChildEntity, Column } from 'typeorm';
import { AuthenticationMethod } from './authentication-method.entity';

@ChildEntity('external')
export class ExternalAuthenticationMethod extends AuthenticationMethod {
  @Column({ nullable: true })
  strategy: string;

  @Column({ name: 'external_identifier', nullable: true })
  externalIdentifier: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
}
