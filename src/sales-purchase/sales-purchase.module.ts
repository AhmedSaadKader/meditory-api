import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Supplier } from './entities/supplier.entity';
import { Customer } from './entities/customer.entity';
import {
  PurchaseOrder,
  PurchaseOrderItem,
} from './entities/purchase-order.entity';

// Services
import { SupplierService } from './services/supplier.service';
import { CustomerService } from './services/customer.service';
import { PurchaseOrderService } from './services/purchase-order.service';

// Controllers
import { SupplierController } from './controllers/supplier.controller';
import { CustomerController } from './controllers/customer.controller';
import { PurchaseOrderController } from './controllers/purchase-order.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Supplier,
      Customer,
      PurchaseOrder,
      PurchaseOrderItem,
    ]),
  ],
  controllers: [SupplierController, CustomerController, PurchaseOrderController],
  providers: [SupplierService, CustomerService, PurchaseOrderService],
  exports: [SupplierService, CustomerService, PurchaseOrderService],
})
export class SalesPurchaseModule {}
