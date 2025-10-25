import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../enums/permission.enum';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';

@Injectable()
export class RoleService {
  // System role constants (following Vendure pattern)
  private readonly SYSTEM_ROLE_CODES = [
    'superadmin',
    'pharmacist',
    'pharmacy_admin',
  ];

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
   * Create a new role (following Vendure pattern)
   */
  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    // Validate permissions
    this.validatePermissions(createRoleDto.permissions);

    // Ensure unique code
    const existing = await this.findByCode(createRoleDto.code);
    if (existing) {
      throw new BadRequestException(
        `Role with code '${createRoleDto.code}' already exists`,
      );
    }

    // Auto-add Authenticated permission (Vendure pattern)
    const permissions = this.deduplicatePermissions([
      Permission.Authenticated,
      ...createRoleDto.permissions,
    ]);

    const role = this.roleRepository.create({
      ...createRoleDto,
      permissions,
      isSystem: false, // New roles are never system roles
    });

    return this.roleRepository.save(role);
  }

  /**
   * Update role (following Vendure pattern)
   */
  async update(roleId: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Protect system roles (Vendure pattern)
    if (role.isSystem || this.SYSTEM_ROLE_CODES.includes(role.code)) {
      throw new BadRequestException(
        `Cannot modify system role '${role.code}'. System roles are protected.`,
      );
    }

    // Validate permissions if provided
    if (updateRoleDto.permissions) {
      this.validatePermissions(updateRoleDto.permissions);

      // Auto-add Authenticated and deduplicate (Vendure pattern)
      updateRoleDto.permissions = this.deduplicatePermissions([
        Permission.Authenticated,
        ...updateRoleDto.permissions,
      ]);
    }

    // Prevent code changes if trying to use system role code
    if (
      updateRoleDto.code &&
      this.SYSTEM_ROLE_CODES.includes(updateRoleDto.code)
    ) {
      throw new BadRequestException(
        `Cannot use system role code '${updateRoleDto.code}'`,
      );
    }

    Object.assign(role, updateRoleDto);
    return this.roleRepository.save(role);
  }

  /**
   * Delete role (prevents deletion of system roles - Vendure pattern)
   */
  async delete(roleId: number): Promise<void> {
    const role = await this.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Protect system roles (Vendure pattern)
    if (role.isSystem || this.SYSTEM_ROLE_CODES.includes(role.code)) {
      throw new BadRequestException(
        `Cannot delete system role '${role.code}'. System roles are protected.`,
      );
    }

    await this.roleRepository.remove(role);
  }

  /**
   * Validate permissions are assignable (Vendure pattern)
   * Prevents assigning SuperAdmin, Owner, Public, or invalid permissions
   */
  private validatePermissions(permissions: Permission[]): void {
    const nonAssignablePermissions = [
      Permission.SuperAdmin,
      Permission.Owner,
      Permission.Public,
    ];

    for (const permission of permissions) {
      // Check if permission is valid enum value
      if (!Object.values(Permission).includes(permission)) {
        throw new BadRequestException(`Invalid permission: ${permission}`);
      }

      // Prevent assigning non-assignable permissions
      if (nonAssignablePermissions.includes(permission)) {
        throw new BadRequestException(
          `Permission '${permission}' cannot be assigned to roles`,
        );
      }
    }
  }

  /**
   * Deduplicate permissions array (Vendure pattern)
   */
  private deduplicatePermissions(permissions: Permission[]): Permission[] {
    return Array.from(new Set(permissions));
  }

  /**
   * Get all assignable permissions
   */
  getAssignablePermissions(): Permission[] {
    return Object.values(Permission).filter(
      (p) =>
        ![
          Permission.SuperAdmin,
          Permission.Owner,
          Permission.Public,
          Permission.Authenticated,
        ].includes(p),
    );
  }
}
