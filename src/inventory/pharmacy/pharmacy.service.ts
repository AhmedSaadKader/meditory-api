import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pharmacy } from '../entities/pharmacy.entity';
import { CreatePharmacyDto } from '../dto/create-pharmacy.dto';
import { UpdatePharmacyDto } from '../dto/update-pharmacy.dto';
import { RequestContext } from '../../auth/types/request-context';

@Injectable()
export class PharmacyService {
  constructor(
    @InjectRepository(Pharmacy)
    private pharmacyRepository: Repository<Pharmacy>,
  ) {}

  async create(createPharmacyDto: CreatePharmacyDto, ctx: RequestContext): Promise<Pharmacy> {
    const organizationId = ctx.activeOrganizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    const pharmacy = this.pharmacyRepository.create({
      ...createPharmacyDto,
      organizationId,
    });
    return this.pharmacyRepository.save(pharmacy);
  }

  async findAll(ctx: RequestContext): Promise<Pharmacy[]> {
    const organizationId = ctx.activeOrganizationId;

    // Platform SuperAdmin can see all pharmacies
    if (ctx.isPlatformSuperAdmin()) {
      return this.pharmacyRepository.find({
        order: { createdAt: 'DESC' },
        relations: ['organization'],
      });
    }

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    return this.pharmacyRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, ctx: RequestContext): Promise<Pharmacy> {
    const pharmacy = await this.pharmacyRepository.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!pharmacy) {
      throw new NotFoundException(`Pharmacy with ID ${id} not found`);
    }

    // Platform SuperAdmin can access all pharmacies
    if (ctx.isPlatformSuperAdmin()) {
      return pharmacy;
    }

    // Verify pharmacy belongs to user's organization
    const organizationId = ctx.activeOrganizationId;
    if (!organizationId || pharmacy.organizationId !== organizationId) {
      throw new NotFoundException(`Pharmacy with ID ${id} not found`);
    }

    return pharmacy;
  }

  async update(
    id: string,
    updatePharmacyDto: UpdatePharmacyDto,
    ctx: RequestContext,
  ): Promise<Pharmacy> {
    const pharmacy = await this.findOne(id, ctx);
    Object.assign(pharmacy, updatePharmacyDto);
    return this.pharmacyRepository.save(pharmacy);
  }

  async remove(id: string, ctx: RequestContext): Promise<void> {
    const pharmacy = await this.findOne(id, ctx);
    await this.pharmacyRepository.remove(pharmacy);
  }
}
