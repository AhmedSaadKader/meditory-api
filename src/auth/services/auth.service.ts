import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { SessionService } from './session.service';
import { NativeAuthenticationStrategy } from '../strategies/native-authentication.strategy';
import { NativeAuthenticationMethod } from '../entities/native-authentication-method.entity';
import { PasswordCipherService } from './password-cipher.service';
import { Role } from '../entities/role.entity';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private sessionService: SessionService,
    private nativeAuthStrategy: NativeAuthenticationStrategy,
    private passwordCipher: PasswordCipherService,
    private dataSource: DataSource,
  ) {}

  /**
   * Authenticate user with username, password, and organization code
   */
  async authenticate(
    organizationCode: string,
    username: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Session | { error: string }> {
    // Step 1: Find organization
    const organization = await this.organizationRepository.findOne({
      where: { code: organizationCode, isActive: true },
    });

    if (!organization) {
      return { error: 'Invalid organization or credentials' };
    }

    // Step 2: Find user in that organization
    const user = await this.userRepository.findOne({
      where: {
        username,
        organizationId: organization.id,
        deletedAt: IsNull(),
      },
      relations: ['roles', 'roles.pharmacies', 'authenticationMethods'],
    });

    if (!user) {
      return { error: 'Invalid organization or credentials' };
    }

    // Step 3: Validate password
    const nativeAuth = user.getNativeAuthenticationMethod();
    if (!nativeAuth) {
      return { error: 'Invalid credentials' };
    }

    const isValid = await this.passwordCipher.check(
      password,
      nativeAuth.passwordHash,
    );

    if (!isValid) {
      return { error: 'Invalid credentials' };
    }

    // Use transaction to update lastLogin and create session atomically
    return this.dataSource.transaction(async (manager) => {
      // Update last login
      user.lastLoginAt = new Date();
      await manager.save(user);

      // Create session
      const session = await this.sessionService.createNewAuthenticatedSession(
        user,
        this.nativeAuthStrategy.name,
        ipAddress,
        userAgent,
      );

      return session;
    });
  }

  /**
   * Logout user by invalidating session
   */
  async logout(sessionToken: string): Promise<void> {
    await this.sessionService.invalidateSession(sessionToken);
  }

  /**
   * Logout from all devices (delete all user sessions)
   */
  async logoutAll(user: User): Promise<void> {
    await this.sessionService.deleteSessionsByUser(user);
  }

  /**
   * Register a new user with username and password
   */
  async register(
    organizationCode: string,
    username: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ): Promise<User | { error: string }> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Find organization
      const organization = await manager.findOne(Organization, {
        where: { code: organizationCode, isActive: true },
      });

      if (!organization) {
        return { error: 'Invalid organization code' };
      }

      // 2. Create user
      const user = manager.create(User, {
        username,
        firstName,
        lastName,
        verified: true,
        organizationId: organization.id,
      });
      await manager.save(user);

      // 3. Create authentication method
      const passwordHash = await this.passwordCipher.hash(password);

      const authMethod = manager.create(NativeAuthenticationMethod, {
        user,
        userId: user.userId,
        type: 'native',
        identifier: username,
        passwordHash,
      });
      await manager.save(authMethod);

      // 4. Assign default role (pharmacist)
      const defaultRole = await manager.findOne(Role, {
        where: { code: 'pharmacist' },
      });

      if (defaultRole) {
        user.roles = [defaultRole];
        await manager.save(user);
      }

      return user;
    });
  }

  /**
   * Admin-only password reset
   */
  async resetUserPassword(
    userId: number,
    newPassword: string,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { userId, deletedAt: IsNull() },
        relations: ['authenticationMethods'],
      });

      if (!user) {
        return false;
      }

      const nativeAuth = user.getNativeAuthenticationMethod();
      if (!nativeAuth) {
        return false;
      }

      // Hash new password
      const passwordHash = await this.passwordCipher.hash(newPassword);
      nativeAuth.passwordHash = passwordHash;
      await manager.save(nativeAuth);

      // Invalidate all user sessions for security
      await this.sessionService.deleteSessionsByUser(user);

      return true;
    });
  }
}
