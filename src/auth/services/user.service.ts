import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../entities/user.entity';
import { SessionService } from './session.service';
import { NativeAuthenticationMethod } from '../entities/native-authentication-method.entity';
import { PasswordCipherService } from './password-cipher.service';

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
   * Find user by ID (filters deleted users)
   */
  async findById(userId: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        userId,
        deletedAt: IsNull(),
      },
      relations: ['roles', 'authenticationMethods'],
    });
  }

  /**
   * Find user by username (filters deleted users)
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        username,
        deletedAt: IsNull(),
      },
      relations: ['roles', 'authenticationMethods'],
    });
  }

  /**
   * Find all users (filters deleted users by default)
   */
  async findAll(includeDeleted = false): Promise<User[]> {
    if (includeDeleted) {
      return this.userRepository.find({
        relations: ['roles'],
      });
    }

    return this.userRepository.find({
      where: {
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
  async update(userId: number, userData: Partial<User>): Promise<User | null> {
    const user = await this.findById(userId);
    if (!user) {
      return null;
    }

    Object.assign(user, userData);
    return this.userRepository.save(user);
  }

  /**
   * Soft delete user
   */
  async softDelete(userId: number): Promise<void> {
    const user = await this.findById(userId);
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
  async resetPassword(userId: number, newPassword: string): Promise<void> {
    const user = await this.findById(userId);
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
