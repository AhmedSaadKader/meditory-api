import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../entities/user.entity';
import { SessionService } from './session.service';
import { NativeAuthenticationMethod } from '../entities/native-authentication-method.entity';
import { PasswordCipherService } from './password-cipher.service';
import { RequestContext } from '../types/request-context';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(NativeAuthenticationMethod)
    private authMethodRepository: Repository<NativeAuthenticationMethod>,
    private sessionService: SessionService,
    private passwordCipher: PasswordCipherService,
  ) {}

  /**
   * Find user by ID (filters deleted users and organization)
   */
  async findById(userId: number, ctx: RequestContext): Promise<User | null> {
    const organizationId = ctx.activeOrganizationId;

    // Platform SuperAdmin can access all users
    if (ctx.isPlatformSuperAdmin()) {
      return this.userRepository.findOne({
        where: {
          userId,
          deletedAt: IsNull(),
        },
        relations: ['roles', 'authenticationMethods', 'organization'],
      });
    }

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    return this.userRepository.findOne({
      where: {
        userId,
        organizationId,
        deletedAt: IsNull(),
      },
      relations: ['roles', 'authenticationMethods'],
    });
  }

  /**
   * Find user by username within organization (filters deleted users)
   */
  async findByUsername(username: string, ctx: RequestContext): Promise<User | null> {
    const organizationId = ctx.activeOrganizationId;

    // Platform SuperAdmin can access all users
    if (ctx.isPlatformSuperAdmin()) {
      return this.userRepository.findOne({
        where: {
          username,
          deletedAt: IsNull(),
        },
        relations: ['roles', 'authenticationMethods', 'organization'],
      });
    }

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    return this.userRepository.findOne({
      where: {
        username,
        organizationId,
        deletedAt: IsNull(),
      },
      relations: ['roles', 'authenticationMethods'],
    });
  }

  /**
   * Find all users (filters deleted users by default and scoped by organization)
   */
  async findAll(ctx: RequestContext, includeDeleted = false): Promise<User[]> {
    const organizationId = ctx.activeOrganizationId;

    // Platform SuperAdmin can see all users
    if (ctx.isPlatformSuperAdmin()) {
      if (includeDeleted) {
        return this.userRepository.find({
          relations: ['roles', 'organization'],
        });
      }

      return this.userRepository.find({
        where: {
          deletedAt: IsNull(),
        },
        relations: ['roles', 'organization'],
      });
    }

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    if (includeDeleted) {
      return this.userRepository.find({
        where: { organizationId },
        relations: ['roles'],
      });
    }

    return this.userRepository.find({
      where: {
        organizationId,
        deletedAt: IsNull(),
      },
      relations: ['roles'],
    });
  }

  /**
   * Create a new user
   */
  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  /**
   * Update user
   */
  async update(userId: number, userData: Partial<User>, ctx?: RequestContext): Promise<User | null> {
    // If ctx is not provided, just update without loading user first
    if (!ctx) {
      const user = await this.userRepository.findOne({
        where: { userId, deletedAt: IsNull() },
      });
      if (!user) {
        return null;
      }
      Object.assign(user, userData);
      return this.userRepository.save(user);
    }

    const user = await this.findById(userId, ctx);
    if (!user) {
      return null;
    }

    Object.assign(user, userData);
    return this.userRepository.save(user);
  }

  /**
   * Soft delete user
   */
  async softDelete(userId: number, ctx?: RequestContext): Promise<void> {
    // Load user without context if not provided
    const user = ctx
      ? await this.findById(userId, ctx)
      : await this.userRepository.findOne({ where: { userId, deletedAt: IsNull() } });

    if (!user) {
      return;
    }

    // Soft delete user
    await this.userRepository.update(userId, {
      deletedAt: new Date(),
    });

    // Invalidate all sessions
    await this.sessionService.deleteSessionsByUser(user);
  }

  /**
   * Restore soft-deleted user
   */
  async restore(userId: number): Promise<void> {
    await this.userRepository.update(userId, {
      deletedAt: null,
    });
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: number, roleId: number): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { userId, deletedAt: IsNull() },
      relations: ['roles'],
    });

    if (!user) {
      return null;
    }

    // Check if user already has this role
    const hasRole = user.roles.some((role) => role.roleId === roleId);
    if (hasRole) {
      return user;
    }

    // Add role (TypeORM will handle the join table)
    // Note: You'll need to load the Role entity and add it
    // This is simplified - in production, inject RoleService
    return user;
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: number, roleId: number): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { userId, deletedAt: IsNull() },
      relations: ['roles'],
    });

    if (!user) {
      return null;
    }

    user.roles = user.roles.filter((role) => role.roleId !== roleId);
    return this.userRepository.save(user);
  }

  /**
   * Reset user password (admin operation)
   */
  async resetPassword(userId: number, newPassword: string, ctx?: RequestContext): Promise<void> {
    // Load user without context if not provided
    const user = ctx
      ? await this.findById(userId, ctx)
      : await this.userRepository.findOne({ where: { userId, deletedAt: IsNull() } });

    if (!user) {
      throw new Error('User not found');
    }

    // Find the native authentication method for this user
    const authMethod = await this.authMethodRepository.findOne({
      where: { userId, type: 'native' },
    });

    if (!authMethod) {
      throw new Error('Native authentication method not found for this user');
    }

    // Hash the new password
    const passwordHash = await this.passwordCipher.hash(newPassword);

    // Update the password
    authMethod.passwordHash = passwordHash;
    await this.authMethodRepository.save(authMethod);

    // Invalidate all sessions to force re-login
    await this.sessionService.deleteSessionsByUser(user);
  }
}
