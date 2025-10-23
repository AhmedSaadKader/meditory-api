import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../entities/user.entity';
import { SessionService } from './session.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private sessionService: SessionService,
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
   * Find user by email (filters deleted users)
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        email,
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
}
