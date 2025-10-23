import { ChildEntity, Column } from 'typeorm';
import { AuthenticationMethod } from './authentication-method.entity';

@ChildEntity('external')
export class ExternalAuthenticationMethod extends AuthenticationMethod {
  @Column({ type: 'varchar', nullable: true })
  strategy: string;

  @Column({ type: 'varchar', name: 'external_identifier', nullable: true })
  externalIdentifier: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
}
