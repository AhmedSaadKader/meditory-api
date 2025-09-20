import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DrugsModule } from './drugs/drugs.module';

@Module({
  imports: [DrugsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
