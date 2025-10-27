import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Supplier } from './entities/supplier.entity';
import { Customer } from './entities/customer.entity';

// Services
import { SupplierService } from './services/supplier.service';
import { CustomerService } from './services/customer.service';

// Controllers
import { SupplierController } from './controllers/supplier.controller';
import { CustomerController } from './controllers/customer.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, Customer])],
  controllers: [SupplierController, CustomerController],
  providers: [SupplierService, CustomerService],
  exports: [SupplierService, CustomerService],
})
export class SalesPurchaseModule {}
