import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pharmacy } from '../entities/pharmacy.entity';
import { CreatePharmacyDto } from '../dto/create-pharmacy.dto';
import { UpdatePharmacyDto } from '../dto/update-pharmacy.dto';

@Injectable()
export class PharmacyService {
  constructor(
    @InjectRepository(Pharmacy)
    private pharmacyRepository: Repository<Pharmacy>,
  ) {}

  async create(createPharmacyDto: CreatePharmacyDto): Promise<Pharmacy> {
    const pharmacy = this.pharmacyRepository.create(createPharmacyDto);
    return this.pharmacyRepository.save(pharmacy);
  }

  async findAll(): Promise<Pharmacy[]> {
    return this.pharmacyRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Pharmacy> {
    const pharmacy = await this.pharmacyRepository.findOne({ where: { id } });
    if (!pharmacy) {
      throw new NotFoundException(`Pharmacy with ID ${id} not found`);
    }
    return pharmacy;
  }

  async update(
    id: string,
    updatePharmacyDto: UpdatePharmacyDto,
  ): Promise<Pharmacy> {
    const pharmacy = await this.findOne(id);
    Object.assign(pharmacy, updatePharmacyDto);
    return this.pharmacyRepository.save(pharmacy);
  }

  async remove(id: string): Promise<void> {
    const pharmacy = await this.findOne(id);
    await this.pharmacyRepository.remove(pharmacy);
  }
}
