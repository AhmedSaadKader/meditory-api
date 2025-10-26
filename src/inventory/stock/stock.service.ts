import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PharmacyStock } from '../entities/pharmacy-stock.entity';
import {
  StockMovement,
  StockMovementType,
} from '../entities/stock-movement.entity';
import { ReceiveStockDto } from '../dto/receive-stock.dto';
import { Drug } from '../../drugs/entities/drug.entity';
import { DispenseStockDto } from '../dto/dispense-stock.dto';
import { AdjustStockDto } from '../dto/adjust-stock.dto';
import { TransferStockDto } from '../dto/transfer-stock.dto';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(PharmacyStock)
    private pharmacyStockRepository: Repository<PharmacyStock>,
    @InjectRepository(StockMovement)
    private stockMovementRepository: Repository<StockMovement>,
    private dataSource: DataSource,
  ) {}

  async receiveStock(dto: ReceiveStockDto) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Validate that drug exists and get reference data
      const drug = await manager.findOne(Drug, {
        where: { drug_id: dto.drugId },
      });

      if (!drug) {
        throw new NotFoundException(
          `Drug with ID ${dto.drugId} not found in reference catalog`,
        );
      }

      // 2. Use provided selling price or default to drug reference price
      const sellingPrice = dto.sellingPrice ?? Number(drug.price);

      // 1. Find or create stock record for this batch
      let stock = await manager.findOne(PharmacyStock, {
        where: {
          pharmacyId: dto.pharmacyId,
          drugId: dto.drugId,
          batchNumber: dto.batchNumber,
        },
      });

      const isNewBatch = !stock;

      if (isNewBatch) {
        // Create new stock record
        stock = manager.create(PharmacyStock, {
          pharmacyId: dto.pharmacyId,
          drugId: dto.drugId,
          batchNumber: dto.batchNumber,
          quantity: dto.quantity,
          expiryDate: new Date(dto.expiryDate),
          costPrice: dto.costPrice,
          sellingPrice: sellingPrice,
          supplierName: dto.supplierName,
          supplierInvoiceNumber: dto.supplierInvoiceNumber,
          minimumStockLevel: dto.minimumStockLevel || 0,
          receivedDate: new Date(),
          notes: dto.notes,
        });
      } else {
        // Update existing batch
        stock!.quantity = Number(stock!.quantity) + dto.quantity;

        // Update prices if provided (latest price wins)
        if (dto.costPrice) stock!.costPrice = dto.costPrice;
        if (dto.sellingPrice) stock!.sellingPrice = dto.sellingPrice;

        // Append notes if provided
        if (dto.notes) {
          stock!.notes = stock!.notes
            ? `${stock!.notes}\n${new Date().toISOString()}: ${dto.notes}`
            : dto.notes;
        }
      }

      // TypeScript doesn't know stock is guaranteed to be non-null here
      if (!stock) {
        throw new Error('Stock initialization failed');
      }

      const savedStock = await manager.save(PharmacyStock, stock);

      // 2. Create stock movement record
      const movement = manager.create(StockMovement, {
        type: StockMovementType.PURCHASE,
        pharmacyId: dto.pharmacyId,
        drugId: dto.drugId,
        batchNumber: dto.batchNumber,
        quantity: dto.quantity,
        balanceAfter: Number(savedStock.quantity),
        referenceType: 'manual_receive',
        referenceNumber: dto.supplierInvoiceNumber,
        userId: dto.userId,
        notes: dto.notes,
      });

      await manager.save(StockMovement, movement);

      return {
        success: true,
        message: isNewBatch
          ? 'New batch received successfully'
          : 'Stock added to existing batch',
        stock: savedStock,
        movement,
      };
    });
  }

  async dispenseStock(dto: DispenseStockDto) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Find available batches using FEFO (First Expired, First Out)
      const availableBatches = await manager.find(PharmacyStock, {
        where: {
          pharmacyId: dto.pharmacyId,
          drugId: dto.drugId,
          isQuarantined: false,
        },
        order: {
          expiryDate: 'ASC', // FEFO logic
        },
      });

      // Filter out expired batches
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const validBatches = availableBatches.filter((batch) => {
        const expiryDate = new Date(batch.expiryDate);
        return expiryDate >= today;
      });

      if (validBatches.length === 0) {
        throw new NotFoundException(
          `No available stock found for drug ${dto.drugId} in pharmacy ${dto.pharmacyId}`,
        );
      }

      // 2. Calculate total available stock
      const totalAvailable = validBatches.reduce(
        (sum, batch) =>
          sum + (Number(batch.quantity) - Number(batch.allocatedQuantity)),
        0,
      );

      if (totalAvailable < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Requested: ${dto.quantity}, Available: ${totalAvailable}`,
        );
      }

      // 3. Deduct from batches in FEFO order
      let remainingQty = dto.quantity;
      const movements: StockMovement[] = [];

      for (const batch of validBatches) {
        if (remainingQty <= 0) break;

        const available =
          Number(batch.quantity) - Number(batch.allocatedQuantity);
        if (available <= 0) continue;

        const toDeduct = Math.min(available, remainingQty);

        // Update batch quantity
        batch.quantity = Number(batch.quantity) - toDeduct;
        await manager.save(PharmacyStock, batch);

        // Create movement record
        const movement = manager.create(StockMovement, {
          type: StockMovementType.SALE,
          pharmacyId: dto.pharmacyId,
          drugId: dto.drugId,
          batchNumber: batch.batchNumber,
          quantity: -toDeduct, // Negative for decrease
          balanceAfter: Number(batch.quantity),
          referenceType: 'manual_dispense',
          referenceNumber: dto.referenceNumber,
          userId: dto.userId,
          notes: dto.notes,
        });

        await manager.save(StockMovement, movement);
        movements.push(movement);

        remainingQty -= toDeduct;
      }

      return {
        success: true,
        message: `Dispensed ${dto.quantity} units from ${movements.length} batch(es)`,
        movements,
        remainingStock: totalAvailable - dto.quantity,
      };
    });
  }

  async getStockLevelsByPharmacy(pharmacyId: string) {
    const stocks = await this.pharmacyStockRepository.find({
      where: { pharmacyId },
      order: { expiryDate: 'ASC' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return stocks.map((stock) => ({
      ...stock,
      availableQuantity:
        Number(stock.quantity) - Number(stock.allocatedQuantity),
      isExpired: new Date(stock.expiryDate) < today,
      isExpiringSoon:
        new Date(stock.expiryDate).getTime() - today.getTime() <
        90 * 24 * 60 * 60 * 1000, // 90 days
    }));
  }

  async getMovementHistory(pharmacyId: string, limit = 100) {
    return await this.stockMovementRepository.find({
      where: { pharmacyId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async adjustStock(dto: AdjustStockDto) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Find the stock batch
      const stock = await manager.findOne(PharmacyStock, {
        where: {
          pharmacyId: dto.pharmacyId,
          drugId: dto.drugId,
          batchNumber: dto.batchNumber,
        },
      });

      if (!stock) {
        throw new NotFoundException(
          `Stock batch not found for drug ${dto.drugId}, batch ${dto.batchNumber}`,
        );
      }

      // 2. Calculate new quantity
      const oldQuantity = Number(stock.quantity);
      const newQuantity = oldQuantity + dto.adjustmentQuantity;

      if (newQuantity < 0) {
        throw new BadRequestException(
          `Cannot adjust stock below zero. Current: ${oldQuantity}, Adjustment: ${dto.adjustmentQuantity}`,
        );
      }

      // 3. Update stock
      stock.quantity = newQuantity;
      await manager.save(PharmacyStock, stock);

      // 4. Create adjustment movement
      const movement = manager.create(StockMovement, {
        type: StockMovementType.ADJUSTMENT,
        pharmacyId: dto.pharmacyId,
        drugId: dto.drugId,
        batchNumber: dto.batchNumber,
        quantity: dto.adjustmentQuantity,
        balanceAfter: newQuantity,
        referenceType: 'manual_adjustment',
        userId: dto.userId,
        notes: dto.reason,
        metadata: {
          oldQuantity,
          newQuantity,
          reason: dto.reason,
        },
      });

      await manager.save(StockMovement, movement);

      return {
        success: true,
        message: 'Stock adjusted successfully',
        stock,
        movement,
      };
    });
  }

  async getLowStockItems(pharmacyId: string) {
    const stocks = await this.pharmacyStockRepository
      .createQueryBuilder('stock')
      .where('stock.pharmacyId = :pharmacyId', { pharmacyId })
      .andWhere('stock.isQuarantined = false')
      .andWhere(
        '(stock.quantity - stock.allocatedQuantity) <= stock.minimumStockLevel',
      )
      .orderBy(
        '(stock.quantity - stock.allocatedQuantity) / NULLIF(stock.minimumStockLevel, 0)',
        'ASC',
      )
      .getMany();

    return stocks.map((stock) => ({
      ...stock,
      availableQuantity:
        Number(stock.quantity) - Number(stock.allocatedQuantity),
      deficit:
        stock.minimumStockLevel -
        (Number(stock.quantity) - Number(stock.allocatedQuantity)),
    }));
  }

  async getExpiringStock(pharmacyId: string, daysThreshold = 90) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thresholdDate = new Date(today);
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const stocks = await this.pharmacyStockRepository
      .createQueryBuilder('stock')
      .where('stock.pharmacyId = :pharmacyId', { pharmacyId })
      .andWhere('stock.expiryDate <= :thresholdDate', { thresholdDate })
      .andWhere('stock.expiryDate >= :today', { today })
      .andWhere('stock.quantity > 0')
      .orderBy('stock.expiryDate', 'ASC')
      .getMany();

    return stocks.map((stock) => {
      const daysUntilExpiry = Math.floor(
        (new Date(stock.expiryDate).getTime() - today.getTime()) /
          (24 * 60 * 60 * 1000),
      );
      return {
        ...stock,
        daysUntilExpiry,
        availableQuantity:
          Number(stock.quantity) - Number(stock.allocatedQuantity),
      };
    });
  }

  async removeExpiredStock(pharmacyId: string, userId: number) {
    return await this.dataSource.transaction(async (manager) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all expired stock
      const expiredStocks = await manager.find(PharmacyStock, {
        where: {
          pharmacyId,
        },
      });

      const expiredBatches = expiredStocks.filter(
        (stock) =>
          new Date(stock.expiryDate) < today && Number(stock.quantity) > 0,
      );

      if (expiredBatches.length === 0) {
        return {
          success: true,
          message: 'No expired stock found',
          removed: [],
        };
      }

      const movements: StockMovement[] = [];

      for (const batch of expiredBatches) {
        const quantityToRemove = Number(batch.quantity);

        // Create expiry movement
        const movement = manager.create(StockMovement, {
          type: StockMovementType.EXPIRY,
          pharmacyId,
          drugId: batch.drugId,
          batchNumber: batch.batchNumber,
          quantity: -quantityToRemove,
          balanceAfter: 0,
          referenceType: 'auto_expiry_removal',
          userId,
          notes: `Expired on ${batch.expiryDate}`,
          metadata: {
            expiryDate: batch.expiryDate,
            costValue: Number(batch.costPrice) * quantityToRemove,
          },
        });

        await manager.save(StockMovement, movement);
        movements.push(movement);

        // Update stock to zero
        batch.quantity = 0;
        await manager.save(PharmacyStock, batch);
      }

      return {
        success: true,
        message: `Removed ${expiredBatches.length} expired batch(es)`,
        removed: movements,
      };
    });
  }

  async transferStock(dto: TransferStockDto) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Find source stock
      const sourceStock = await manager.findOne(PharmacyStock, {
        where: {
          pharmacyId: dto.fromPharmacyId,
          drugId: dto.drugId,
          batchNumber: dto.batchNumber,
        },
      });

      if (!sourceStock) {
        throw new NotFoundException(
          `Source stock not found in pharmacy ${dto.fromPharmacyId}`,
        );
      }

      const available =
        Number(sourceStock.quantity) - Number(sourceStock.allocatedQuantity);

      if (available < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Requested: ${dto.quantity}, Available: ${available}`,
        );
      }

      // 2. Deduct from source
      sourceStock.quantity = Number(sourceStock.quantity) - dto.quantity;
      await manager.save(PharmacyStock, sourceStock);

      // 3. Create TRANSFER_OUT movement
      const transferOutMovement = manager.create(StockMovement, {
        type: StockMovementType.TRANSFER_OUT,
        pharmacyId: dto.fromPharmacyId,
        drugId: dto.drugId,
        batchNumber: dto.batchNumber,
        quantity: -dto.quantity,
        balanceAfter: Number(sourceStock.quantity),
        referenceType: 'inter_pharmacy_transfer',
        referenceNumber: `TO-${dto.toPharmacyId}`,
        userId: dto.userId,
        metadata: {
          toPharmacyId: dto.toPharmacyId,
        },
      });

      await manager.save(StockMovement, transferOutMovement);

      // 4. Find or create destination stock
      let destStock = await manager.findOne(PharmacyStock, {
        where: {
          pharmacyId: dto.toPharmacyId,
          drugId: dto.drugId,
          batchNumber: dto.batchNumber,
        },
      });

      if (!destStock) {
        // Create new batch at destination
        destStock = manager.create(PharmacyStock, {
          pharmacyId: dto.toPharmacyId,
          drugId: dto.drugId,
          batchNumber: dto.batchNumber,
          quantity: dto.quantity,
          expiryDate: sourceStock.expiryDate,
          costPrice: sourceStock.costPrice,
          sellingPrice: sourceStock.sellingPrice,
          supplierName: sourceStock.supplierName,
          minimumStockLevel: 0,
          receivedDate: new Date(),
          notes: `Transferred from pharmacy ${dto.fromPharmacyId}`,
        });
      } else {
        // Add to existing batch
        destStock.quantity = Number(destStock.quantity) + dto.quantity;
      }

      await manager.save(PharmacyStock, destStock);

      // 5. Create TRANSFER_IN movement
      const transferInMovement = manager.create(StockMovement, {
        type: StockMovementType.TRANSFER_IN,
        pharmacyId: dto.toPharmacyId,
        drugId: dto.drugId,
        batchNumber: dto.batchNumber,
        quantity: dto.quantity,
        balanceAfter: Number(destStock.quantity),
        referenceType: 'inter_pharmacy_transfer',
        referenceNumber: `FROM-${dto.fromPharmacyId}`,
        userId: dto.userId,
        metadata: {
          fromPharmacyId: dto.fromPharmacyId,
        },
      });

      await manager.save(StockMovement, transferInMovement);

      return {
        success: true,
        message: `Transferred ${dto.quantity} units from ${dto.fromPharmacyId} to ${dto.toPharmacyId}`,
        transferOut: transferOutMovement,
        transferIn: transferInMovement,
      };
    });
  }
}
