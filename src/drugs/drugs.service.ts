import { Injectable } from '@nestjs/common';
import { CreateDrugDto } from './dto/create-drug.dto';
import { UpdateDrugDto } from './dto/update-drug.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Drug } from './entities/drug.entity';
import { Repository } from 'typeorm';
import { paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { DRUG_PAGINATION_CONFIG } from './config/pagination.config';

@Injectable()
export class DrugsService {
  constructor(
    @InjectRepository(Drug)
    private drugsRepository: Repository<Drug>,
  ) {}
  create(createDrugDto: CreateDrugDto) {
    const drug = this.drugsRepository.create(createDrugDto);
    return this.drugsRepository.save(drug);
  }

  findAll(query: PaginateQuery): Promise<Paginated<Drug>> {
    return paginate(query, this.drugsRepository, DRUG_PAGINATION_CONFIG);
  }

  findOne(id: number) {
    return this.drugsRepository.findOne({ where: { drug_id: id } });
  }

  update(id: number, updateDrugDto: UpdateDrugDto) {
    return this.drugsRepository.update(id, updateDrugDto);
  }

  remove(id: number) {
    return this.drugsRepository.delete(id);
  }
}
