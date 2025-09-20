import { Injectable } from '@nestjs/common';
import { CreateDrugDto } from './dto/create-drug.dto';
import { UpdateDrugDto } from './dto/update-drug.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Drug } from './entities/drug.entity';
import { Repository } from 'typeorm';

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

  findAll() {
    return this.drugsRepository.find();
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
