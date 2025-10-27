import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import * as crypto from 'crypto';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  /**
   * Create a new organization
   */
  async create(createDto: CreateOrganizationDto): Promise<Organization> {
    // Check if code already exists
    const existing = await this.organizationRepository.findOne({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new ConflictException('Organization code already exists');
    }

    // Generate API token
    const token = this.generateToken();

    const organization = this.organizationRepository.create({
      ...createDto,
      token,
      isActive: true,
    });

    return await this.organizationRepository.save(organization);
  }

  /**
   * Find all organizations
   */
  async findAll(): Promise<Organization[]> {
    return await this.organizationRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find organization by ID
   */
  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['pharmacies', 'users', 'roles'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  /**
   * Find organization by code
   */
  async findByCode(code: string): Promise<Organization | null> {
    return await this.organizationRepository.findOne({
      where: { code },
    });
  }

  /**
   * Update organization
   */
  async update(
    id: string,
    updateDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const organization = await this.findOne(id);

    // If updating code, check for conflicts
    if (updateDto.code && updateDto.code !== organization.code) {
      const existing = await this.organizationRepository.findOne({
        where: { code: updateDto.code },
      });

      if (existing) {
        throw new ConflictException('Organization code already exists');
      }
    }

    Object.assign(organization, updateDto);
    return await this.organizationRepository.save(organization);
  }

  /**
   * Regenerate organization API token
   */
  async regenerateToken(id: string): Promise<Organization> {
    const organization = await this.findOne(id);
    organization.token = this.generateToken();
    return await this.organizationRepository.save(organization);
  }

  /**
   * Activate organization
   */
  async activate(id: string): Promise<Organization> {
    const organization = await this.findOne(id);
    organization.activate();
    return await this.organizationRepository.save(organization);
  }

  /**
   * Deactivate organization
   */
  async deactivate(id: string): Promise<Organization> {
    const organization = await this.findOne(id);
    organization.deactivate();
    return await this.organizationRepository.save(organization);
  }

  /**
   * Delete organization (soft delete by deactivating)
   */
  async remove(id: string): Promise<void> {
    await this.deactivate(id);
  }

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
