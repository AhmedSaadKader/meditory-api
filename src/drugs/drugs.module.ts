import { Module } from '@nestjs/common';
import { DrugsService } from './drugs.service';
import { DrugsController } from './drugs.controller';
import { ReferenceDataService } from './reference-data.service';
import { ReferenceDataController } from './reference-data.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Drug } from './entities/drug.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Drug])],
  controllers: [DrugsController, ReferenceDataController],
  providers: [DrugsService, ReferenceDataService],
})
export class DrugsModule {}
