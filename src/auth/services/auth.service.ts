import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { SessionService } from './session.service';
import { EmailService } from './email.service';
import { NativeAuthenticationStrategy } from '../strategies/native-authentication.strategy';
import { NativeAuthenticationMethod } from '../entities/native-authentication-method.entity';
import { PasswordCipherService } from './password-cipher.service';
import { Role } from '../entities/role.entity';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private sessionService: SessionService,
    private emailService: EmailService,
    private nativeAuthStrategy: NativeAuthenticationStrategy,
    private passwordCipher: PasswordCipherService,
    private dataSource: DataSource,
  ) {}

  /**
   * Authenticate user with username and password
   */
  async authenticate(
    username: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Session | { error: string }> {
    const user = await this.nativeAuthStrategy.authenticate({
      username,
      password,
    });

    if (!user) {
      return { error: 'Invalid credentials' };
    }

    // Check if email verification is required
    if (!user.verified) {
      return { error: 'Email not verified' };
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
   * Register a new user with email and password
   */
  async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Create unverified user
      const user = manager.create(User, {
        email,
        username: email,
        firstName,
        lastName,
        verified: false,
      });
      await manager.save(user);

      // 2. Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const passwordHash = await this.passwordCipher.hash(password);

      const authMethod = manager.create(NativeAuthenticationMethod, {
        user,
        userId: user.userId,
        type: 'native',
        identifier: email,
        passwordHash,
        verificationToken,
      });
      await manager.save(authMethod);

      // 3. Assign default role (customer/pharmacist based on requirements)
      const defaultRole = await manager.findOne(Role, {
        where: { code: 'pharmacist' },
      });

      if (defaultRole) {
        user.roles = [defaultRole];
        await manager.save(user);
      }

      // Send verification email
      await this.emailService.sendVerificationEmail(email, verificationToken);

      return user;
    });
  }

  /**
   * Verify user email with token
   */
  async verifyEmail(token: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      // Find auth method by token
      const authMethod = await manager.findOne(NativeAuthenticationMethod, {
        where: { verificationToken: token },
        relations: ['user'],
      });

      if (!authMethod) {
        return false; // Invalid token
      }

      // Check token age (24 hour expiry)
      const tokenAge = Date.now() - authMethod.createdAt.getTime();
      const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
      if (tokenAge > MAX_AGE) {
        return false; // Expired
      }

      // Mark user as verified
      authMethod.user.verified = true;
      await manager.save(authMethod.user);

      // Clear token (one-time use)
      authMethod.verificationToken = null;
      await manager.save(authMethod);

      return true;
    });
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { email, verified: false },
        relations: ['authenticationMethods'],
      });

      if (!user) {
        return false; // Already verified or doesn't exist
      }

      const nativeAuth = user.getNativeAuthenticationMethod();
      if (!nativeAuth) {
        return false;
      }

      // Generate new token
      nativeAuth.verificationToken = crypto.randomBytes(32).toString('hex');
      await manager.save(nativeAuth);

      // Send verification email
      await this.emailService.sendVerificationEmail(email, nativeAuth.verificationToken);

      return true;
    });
  }

  /**
   * Request password reset (Vendure pattern)
   * Always returns true to prevent email enumeration
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { email, deletedAt: IsNull() },
        relations: ['authenticationMethods'],
      });

      // Always return true to prevent email enumeration
      if (!user) {
        return true;
      }

      const nativeAuth = user.getNativeAuthenticationMethod();
      if (!nativeAuth) {
        return true;
      }

      // Generate reset token (32 bytes = 64 hex chars, like Vendure)
      const resetToken = crypto.randomBytes(32).toString('hex');
      // Reset expiry: 24 hours (stored in token expiry field if needed in future)

      nativeAuth.passwordResetToken = resetToken;
      await manager.save(nativeAuth);

      // Send password reset email
      await this.emailService.sendPasswordResetEmail(email, resetToken);

      return true;
    });
  }

  /**
   * Reset password with token (Vendure pattern)
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      // Find auth method by reset token
      const authMethod = await manager.findOne(NativeAuthenticationMethod, {
        where: { passwordResetToken: token },
        relations: ['user'],
      });

      if (!authMethod || !authMethod.user) {
        return false; // Invalid token
      }

      // Check if user is deleted
      if (authMethod.user.deletedAt) {
        return false;
      }

      // Vendure uses 2-hour expiry, but we'll keep 24 hours
      // Check token age (tokens don't have separate expiry field in our schema)
      const tokenAge = Date.now() - authMethod.updatedAt.getTime();
      const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
      if (tokenAge > MAX_AGE) {
        return false; // Expired
      }

      // Hash new password
      const passwordHash = await this.passwordCipher.hash(newPassword);
      authMethod.passwordHash = passwordHash;

      // Clear reset token (one-time use, like Vendure)
      authMethod.passwordResetToken = null;

      await manager.save(authMethod);

      // Invalidate all existing sessions (Vendure does this for security)
      await this.sessionService.deleteSessionsByUser(authMethod.user);

      return true;
    });
  }
}
