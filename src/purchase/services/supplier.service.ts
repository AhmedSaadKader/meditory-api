import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from '../entities/supplier.entity';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';
import { RequestContext } from '../../auth/types/request-context';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
  ) {}

  async create(dto: CreateSupplierDto, ctx: RequestContext): Promise<Supplier> {
    const organizationId = ctx.activeOrganizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    // Check if supplier code already exists in organization
    const existing = await this.supplierRepository.findOne({
      where: { organizationId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Supplier with code '${dto.code}' already exists in your organization`,
      );
    }

    const supplier = this.supplierRepository.create({
      ...dto,
      organizationId,
    });

    return await this.supplierRepository.save(supplier);
  }

  async findAll(ctx: RequestContext): Promise<Supplier[]> {
    const organizationId = ctx.activeOrganizationId;

    if (ctx.isPlatformSuperAdmin()) {
      return await this.supplierRepository.find({
        relations: ['organization'],
        order: { createdAt: 'DESC' },
      });
    }

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    return await this.supplierRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, ctx: RequestContext): Promise<Supplier> {
    const organizationId = ctx.activeOrganizationId;

    const supplier = await this.supplierRepository.findOne({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    // Verify organization access
    if (!ctx.isPlatformSuperAdmin() && supplier.organizationId !== organizationId) {
      throw new ForbiddenException('No access to this supplier');
    }

    return supplier;
  }

  async update(
    id: string,
    dto: UpdateSupplierDto,
    ctx: RequestContext,
  ): Promise<Supplier> {
    const supplier = await this.findOne(id, ctx);

    // If updating code, check for conflicts
    if (dto.code && dto.code !== supplier.code) {
      const existing = await this.supplierRepository.findOne({
        where: { organizationId: supplier.organizationId, code: dto.code },
      });

      if (existing) {
        throw new ConflictException(
          `Supplier with code '${dto.code}' already exists in your organization`,
        );
      }
    }

    Object.assign(supplier, dto);
    return await this.supplierRepository.save(supplier);
  }

  async remove(id: string, ctx: RequestContext): Promise<void> {
    const supplier = await this.findOne(id, ctx);
    await this.supplierRepository.remove(supplier);
  }

  async findByCode(code: string, ctx: RequestContext): Promise<Supplier | null> {
    const organizationId = ctx.activeOrganizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    return await this.supplierRepository.findOne({
      where: { organizationId, code },
    });
  }
}
