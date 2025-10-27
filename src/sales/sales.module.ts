import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Customer } from './entities/customer.entity';

// Services
import { CustomerService } from './services/customer.service';

// Controllers
import { CustomerController } from './controllers/customer.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Customer])],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class SalesModule {}
