import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PharmacyService } from './pharmacy/pharmacy.service';
import { PharmacyController } from './pharmacy/pharmacy.controller';
import { Pharmacy } from './entities/pharmacy.entity';
import { PharmacyStock } from './entities/pharmacy-stock.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockService } from './stock/stock.service';
import { StockController } from './stock/stock.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pharmacy, PharmacyStock, StockMovement])],
  providers: [PharmacyService, StockService],
  controllers: [PharmacyController, StockController],
})
export class InventoryModule {}
