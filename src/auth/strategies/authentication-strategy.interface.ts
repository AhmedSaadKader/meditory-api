import { User } from '../entities/user.entity';

export interface AuthenticationStrategy<T = any> {
  readonly name: string;

  /**
   * Authenticate user with provided data
   * Returns User on success, false on failure
   */
  authenticate(data: T): Promise<User | false>;
}
