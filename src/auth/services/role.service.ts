import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  /**
   * Find all roles
   */
  async findAll(): Promise<Role[]> {
    return this.roleRepository.find();
  }

  /**
   * Find role by ID
   */
  async findById(roleId: number): Promise<Role | null> {
    return this.roleRepository.findOne({
      where: { roleId },
    });
  }

  /**
   * Find role by code
   */
  async findByCode(code: string): Promise<Role | null> {
    return this.roleRepository.findOne({
      where: { code },
    });
  }

  /**
   * Create a new role
   */
  async create(roleData: Partial<Role>): Promise<Role> {
    const role = this.roleRepository.create(roleData);
    return this.roleRepository.save(role);
  }

  /**
   * Update role
   */
  async update(roleId: number, roleData: Partial<Role>): Promise<Role | null> {
    const role = await this.findById(roleId);
    if (!role) {
      return null;
    }

    // Prevent modification of system roles' core properties
    if (role.isSystem && roleData.code) {
      throw new BadRequestException('Cannot modify system role code');
    }

    Object.assign(role, roleData);
    return this.roleRepository.save(role);
  }

  /**
   * Delete role (prevents deletion of system roles)
   */
  async delete(roleId: number): Promise<void> {
    const role = await this.findById(roleId);
    if (!role) {
      return;
    }

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system role');
    }

    await this.roleRepository.remove(role);
  }
}
