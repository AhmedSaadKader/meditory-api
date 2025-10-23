import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../entities/user.entity';
import { NativeAuthenticationMethod } from '../entities/native-authentication-method.entity';
import { PasswordCipherService } from '../services/password-cipher.service';
import { AuthenticationStrategy } from './authentication-strategy.interface';

export interface NativeAuthenticationData {
  username: string; // email
  password: string;
}

@Injectable()
export class NativeAuthenticationStrategy
  implements AuthenticationStrategy<NativeAuthenticationData>
{
  readonly name = 'native';

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(NativeAuthenticationMethod)
    private authMethodRepository: Repository<NativeAuthenticationMethod>,
    private passwordCipher: PasswordCipherService,
  ) {}

  async authenticate(data: NativeAuthenticationData): Promise<User | false> {
    // 1. Find user by email (must not be deleted)
    const user = await this.userRepository.findOne({
      where: { email: data.username, deletedAt: IsNull() },
      relations: ['authenticationMethods', 'roles'],
    });

    if (!user) {
      return false;
    }

    // 2. Get native auth method
    const nativeAuthMethod = user.getNativeAuthenticationMethod();
    if (!nativeAuthMethod) {
      return false;
    }

    // 3. Load password hash (select it explicitly for security)
    const authMethod = await this.authMethodRepository.findOne({
      where: { authMethodId: nativeAuthMethod.authMethodId },
      select: ['authMethodId', 'passwordHash'],
    });

    if (!authMethod || !authMethod.passwordHash) {
      return false;
    }

    // 4. Verify password
    const passwordMatches = await this.passwordCipher.check(
      data.password,
      authMethod.passwordHash,
    );

    if (!passwordMatches) {
      return false;
    }

    return user;
  }

  /**
   * Verify password for a specific user
   */
  async verifyUserPassword(userId: number, password: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { userId, deletedAt: IsNull() },
      relations: ['authenticationMethods'],
    });

    if (!user) {
      return false;
    }

    const nativeAuthMethod = user.getNativeAuthenticationMethod();
    if (!nativeAuthMethod) {
      return false;
    }

    const authMethod = await this.authMethodRepository.findOne({
      where: { authMethodId: nativeAuthMethod.authMethodId },
      select: ['authMethodId', 'passwordHash'],
    });

    if (!authMethod || !authMethod.passwordHash) {
      return false;
    }

    return this.passwordCipher.check(password, authMethod.passwordHash);
  }
}
