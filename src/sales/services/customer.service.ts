import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer, CustomerType } from '../entities/customer.entity';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { RequestContext } from '../../auth/types/request-context';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async create(dto: CreateCustomerDto, ctx: RequestContext): Promise<Customer> {
    const organizationId = ctx.activeOrganizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    // If customer has code, check for conflicts
    if (dto.code) {
      const existing = await this.customerRepository.findOne({
        where: { organizationId, code: dto.code },
      });

      if (existing) {
        throw new ConflictException(
          `Customer with code '${dto.code}' already exists in your organization`,
        );
      }
    }

    const customer = this.customerRepository.create({
      ...dto,
      organizationId,
    });

    return await this.customerRepository.save(customer);
  }

  async findAll(ctx: RequestContext): Promise<Customer[]> {
    const organizationId = ctx.activeOrganizationId;

    if (ctx.isPlatformSuperAdmin()) {
      return await this.customerRepository.find({
        relations: ['organization'],
        order: { createdAt: 'DESC' },
      });
    }

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    return await this.customerRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, ctx: RequestContext): Promise<Customer> {
    const organizationId = ctx.activeOrganizationId;

    const customer = await this.customerRepository.findOne({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // Verify organization access
    if (!ctx.isPlatformSuperAdmin() && customer.organizationId !== organizationId) {
      throw new ForbiddenException('No access to this customer');
    }

    return customer;
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    ctx: RequestContext,
  ): Promise<Customer> {
    const customer = await this.findOne(id, ctx);

    // If updating code, check for conflicts
    if (dto.code && dto.code !== customer.code) {
      const existing = await this.customerRepository.findOne({
        where: { organizationId: customer.organizationId, code: dto.code },
      });

      if (existing) {
        throw new ConflictException(
          `Customer with code '${dto.code}' already exists in your organization`,
        );
      }
    }

    Object.assign(customer, dto);
    return await this.customerRepository.save(customer);
  }

  async remove(id: string, ctx: RequestContext): Promise<void> {
    const customer = await this.findOne(id, ctx);
    await this.customerRepository.remove(customer);
  }

  async findByCode(code: string, ctx: RequestContext): Promise<Customer | null> {
    const organizationId = ctx.activeOrganizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    return await this.customerRepository.findOne({
      where: { organizationId, code },
    });
  }

  /**
   * Create or get anonymous walk-in customer for quick sales
   */
  async getOrCreateWalkInCustomer(
    name: string,
    ctx: RequestContext,
  ): Promise<Customer> {
    const organizationId = ctx.activeOrganizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    // Check if walk-in customer already exists
    const existing = await this.customerRepository.findOne({
      where: {
        organizationId,
        type: CustomerType.WALK_IN,
        name,
      },
    });

    if (existing) {
      return existing;
    }

    // Create new walk-in customer
    const customer = this.customerRepository.create({
      organizationId,
      name,
      type: CustomerType.WALK_IN,
      isActive: true,
    });

    return await this.customerRepository.save(customer);
  }
}
