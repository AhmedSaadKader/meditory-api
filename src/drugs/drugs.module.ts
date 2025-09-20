import { Module } from '@nestjs/common';
import { DrugsService } from './drugs.service';
import { DrugsController } from './drugs.controller';

@Module({
  controllers: [DrugsController],
  providers: [DrugsService],
})
export class DrugsModule {}
