import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Supplier } from './entities/supplier.entity';
import {
  PurchaseOrder,
  PurchaseOrderItem,
} from './entities/purchase-order.entity';
import {
  PurchaseReceipt,
  PurchaseReceiptItem,
} from './entities/purchase-receipt.entity';

// Services
import { SupplierService } from './services/supplier.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { PurchaseReceiptService } from './services/purchase-receipt.service';

// Controllers
import { SupplierController } from './controllers/supplier.controller';
import { PurchaseOrderController } from './controllers/purchase-order.controller';
import { PurchaseReceiptController } from './controllers/purchase-receipt.controller';

// Import InventoryModule for StockService
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Supplier,
      PurchaseOrder,
      PurchaseOrderItem,
      PurchaseReceipt,
      PurchaseReceiptItem,
    ]),
    InventoryModule, // For StockService dependency
  ],
  controllers: [
    SupplierController,
    PurchaseOrderController,
    PurchaseReceiptController,
  ],
  providers: [
    SupplierService,
    PurchaseOrderService,
    PurchaseReceiptService,
  ],
  exports: [SupplierService, PurchaseOrderService, PurchaseReceiptService],
})
export class PurchaseModule {}
