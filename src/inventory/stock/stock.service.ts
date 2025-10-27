import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PharmacyStock } from '../entities/pharmacy-stock.entity';
import {
  StockMovement,
  StockMovementType,
} from '../entities/stock-movement.entity';
import { Pharmacy } from '../entities/pharmacy.entity';
import { ReceiveStockDto } from '../dto/receive-stock.dto';
import { Drug } from '../../drugs/entities/drug.entity';
import { DispenseStockDto } from '../dto/dispense-stock.dto';
import { AdjustStockDto } from '../dto/adjust-stock.dto';
import { TransferStockDto } from '../dto/transfer-stock.dto';
import { AllocateStockDto } from '../dto/allocate-stock.dto';
import { ReleaseStockDto } from '../dto/release-stock.dto';
import { RequestContext } from '../../auth/types/request-context';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(PharmacyStock)
    private pharmacyStockRepository: Repository<PharmacyStock>,
    @InjectRepository(StockMovement)
    private stockMovementRepository: Repository<StockMovement>,
    @InjectRepository(Pharmacy)
    private pharmacyRepository: Repository<Pharmacy>,
    private dataSource: DataSource,
  ) {}

  /**
   * Get fiscal year for a given date (ERPNext-inspired)
   * Assumes April-March fiscal year (common in many countries)
   * Override this based on organization settings if needed
   */
  private getFiscalYear(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11

    // If Jan-Mar, fiscal year is (year-1)-year
    // If Apr-Dec, fiscal year is year-(year+1)
    if (month < 3) {
      // Jan, Feb, Mar
      return `${year - 1}-${year}`;
    } else {
      return `${year}-${year + 1}`;
    }
  }

  /**
   * Get fiscal period (quarter) for a given date
   */
  private getFiscalPeriod(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11

    // Fiscal quarters: Apr-Jun (Q1), Jul-Sep (Q2), Oct-Dec (Q3), Jan-Mar (Q4)
    let quarter: number;
    let fiscalYear: string;

    if (month >= 3 && month <= 5) {
      // Apr-Jun
      quarter = 1;
      fiscalYear = `${year}`;
    } else if (month >= 6 && month <= 8) {
      // Jul-Sep
      quarter = 2;
      fiscalYear = `${year}`;
    } else if (month >= 9 && month <= 11) {
      // Oct-Dec
      quarter = 3;
      fiscalYear = `${year}`;
    } else {
      // Jan-Mar
      quarter = 4;
      fiscalYear = `${year - 1}`;
    }

    return `${fiscalYear}-Q${quarter}`;
  }

  /**
   * Verify user has access to pharmacy and it belongs to their organization
   */
  private async verifyPharmacyAccess(
    pharmacyId: string,
    ctx: RequestContext,
  ): Promise<void> {
    const organizationId = ctx.activeOrganizationId;

    // Platform SuperAdmin can access all pharmacies
    if (ctx.isPlatformSuperAdmin()) {
      return;
    }

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    // Verify pharmacy exists and belongs to user's organization
    const pharmacy = await this.pharmacyRepository.findOne({
      where: { id: pharmacyId },
    });

    if (!pharmacy) {
      throw new NotFoundException(`Pharmacy with ID ${pharmacyId} not found`);
    }

    if (pharmacy.organizationId !== organizationId) {
      throw new ForbiddenException('No access to this pharmacy');
    }

    // Check if user has access to this specific pharmacy
    if (!ctx.userHasAccessToPharmacy(pharmacyId)) {
      throw new ForbiddenException('No access to this pharmacy');
    }
  }

  async receiveStock(dto: ReceiveStockDto, userId: number, ctx: RequestContext) {
    // Verify pharmacy access
    await this.verifyPharmacyAccess(dto.pharmacyId, ctx);

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

      // 2. Calculate valuation for the movement
      const valuationRate = dto.costPrice; // Use cost price as valuation rate
      const stockValueDifference = dto.quantity * valuationRate;

      // Get total stock value for this drug/batch across all movements
      const previousMovements = await manager.find(StockMovement, {
        where: {
          pharmacyId: dto.pharmacyId,
          drugId: dto.drugId,
          batchNumber: dto.batchNumber,
        },
        order: { createdAt: 'DESC' },
        take: 1,
      });

      const previousStockValue =
        previousMovements.length > 0 && previousMovements[0].stockValue
          ? Number(previousMovements[0].stockValue)
          : 0;

      const newStockValue = previousStockValue + stockValueDifference;

      // 3. Determine fiscal period
      const now = new Date();
      const fiscalYear = this.getFiscalYear(now);
      const fiscalPeriod = this.getFiscalPeriod(now);

      // 4. Create stock movement record with valuation tracking
      const movement = manager.create(StockMovement, {
        type: StockMovementType.PURCHASE,
        pharmacyId: dto.pharmacyId,
        drugId: dto.drugId,
        batchNumber: dto.batchNumber,
        quantity: dto.quantity,
        balanceAfter: Number(savedStock.quantity),
        referenceType: 'manual_receive',
        referenceNumber: dto.supplierInvoiceNumber,
        userId: userId,
        notes: dto.notes,
        // Valuation tracking (ERPNext-inspired)
        valuationRate,
        stockValue: newStockValue,
        stockValueDifference,
        postingDateTime: now,
        fiscalYear,
        fiscalPeriod,
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

  async dispenseStock(dto: DispenseStockDto, userId: number, ctx: RequestContext) {
    // Verify pharmacy access
    await this.verifyPharmacyAccess(dto.pharmacyId, ctx);

    return await this.dataSource.transaction(async (manager) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Find available batches using FEFO with pessimistic locking to prevent race conditions
      const availableBatches = await manager
        .createQueryBuilder(PharmacyStock, 'stock')
        .setLock('pessimistic_write') // Lock rows to prevent concurrent modifications
        .where('stock.pharmacyId = :pharmacyId', { pharmacyId: dto.pharmacyId })
        .andWhere('stock.drugId = :drugId', { drugId: dto.drugId })
        .andWhere('stock.isQuarantined = false')
        .andWhere('stock.expiryDate >= :today', { today }) // Filter expired at DB level
        .andWhere('stock.quantity > 0')
        .orderBy('stock.expiryDate', 'ASC') // FEFO logic
        .getMany();

      if (availableBatches.length === 0) {
        throw new NotFoundException(
          `No available stock found for drug ${dto.drugId} in pharmacy ${dto.pharmacyId}`,
        );
      }

      // 2. Calculate total available stock
      const totalAvailable = availableBatches.reduce(
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
      const now = new Date();
      const fiscalYear = this.getFiscalYear(now);
      const fiscalPeriod = this.getFiscalPeriod(now);

      for (const batch of availableBatches) {
        if (remainingQty <= 0) break;

        const available =
          Number(batch.quantity) - Number(batch.allocatedQuantity);
        if (available <= 0) continue;

        const toDeduct = Math.min(available, remainingQty);

        // Update batch quantity
        batch.quantity = Number(batch.quantity) - toDeduct;
        await manager.save(PharmacyStock, batch);

        // Calculate valuation for this movement
        const valuationRate = Number(batch.costPrice); // Use batch cost price
        const stockValueDifference = -toDeduct * valuationRate; // Negative for outgoing

        // Get previous stock value for this batch
        const previousMovements = await manager.find(StockMovement, {
          where: {
            pharmacyId: dto.pharmacyId,
            drugId: dto.drugId,
            batchNumber: batch.batchNumber,
          },
          order: { createdAt: 'DESC' },
          take: 1,
        });

        const previousStockValue =
          previousMovements.length > 0 && previousMovements[0].stockValue
            ? Number(previousMovements[0].stockValue)
            : 0;

        const newStockValue = previousStockValue + stockValueDifference;

        // Create movement record with valuation
        const movement = manager.create(StockMovement, {
          type: StockMovementType.SALE,
          pharmacyId: dto.pharmacyId,
          drugId: dto.drugId,
          batchNumber: batch.batchNumber,
          quantity: -toDeduct, // Negative for decrease
          balanceAfter: Number(batch.quantity),
          referenceType: 'manual_dispense',
          referenceNumber: dto.referenceNumber,
          userId: userId,
          notes: dto.notes,
          // Valuation tracking
          valuationRate,
          stockValue: newStockValue,
          stockValueDifference,
          postingDateTime: now,
          fiscalYear,
          fiscalPeriod,
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

  async getStockLevelsByPharmacy(pharmacyId: string, ctx: RequestContext) {
    // Verify pharmacy access
    await this.verifyPharmacyAccess(pharmacyId, ctx);

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

  async getMovementHistory(pharmacyId: string, ctx: RequestContext, limit = 100) {
    // Verify pharmacy access
    await this.verifyPharmacyAccess(pharmacyId, ctx);

    return await this.stockMovementRepository.find({
      where: { pharmacyId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async adjustStock(dto: AdjustStockDto, userId: number, ctx: RequestContext) {
    // Verify pharmacy access
    await this.verifyPharmacyAccess(dto.pharmacyId, ctx);

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

      // Prevent adjusting below allocated quantity
      if (newQuantity < Number(stock.allocatedQuantity)) {
        throw new BadRequestException(
          `Cannot adjust stock below allocated amount. Allocated: ${stock.allocatedQuantity}, ` +
            `Attempted new quantity: ${newQuantity}. Release allocations first.`,
        );
      }

      // 3. Update stock
      stock.quantity = newQuantity;
      await manager.save(PharmacyStock, stock);

      // 4. Calculate valuation for adjustment
      const valuationRate = Number(stock.costPrice);
      const stockValueDifference = dto.adjustmentQuantity * valuationRate;

      const previousMovements = await manager.find(StockMovement, {
        where: {
          pharmacyId: dto.pharmacyId,
          drugId: dto.drugId,
          batchNumber: dto.batchNumber,
        },
        order: { createdAt: 'DESC' },
        take: 1,
      });

      const previousStockValue =
        previousMovements.length > 0 && previousMovements[0].stockValue
          ? Number(previousMovements[0].stockValue)
          : 0;

      const newStockValue = previousStockValue + stockValueDifference;

      const now = new Date();
      const fiscalYear = this.getFiscalYear(now);
      const fiscalPeriod = this.getFiscalPeriod(now);

      // 5. Create adjustment movement with valuation
      const movement = manager.create(StockMovement, {
        type: StockMovementType.ADJUSTMENT,
        pharmacyId: dto.pharmacyId,
        drugId: dto.drugId,
        batchNumber: dto.batchNumber,
        quantity: dto.adjustmentQuantity,
        balanceAfter: newQuantity,
        referenceType: 'manual_adjustment',
        userId: userId,
        notes: dto.reason,
        metadata: {
          oldQuantity,
          newQuantity,
          reason: dto.reason,
        },
        // Valuation tracking
        valuationRate,
        stockValue: newStockValue,
        stockValueDifference,
        postingDateTime: now,
        fiscalYear,
        fiscalPeriod,
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

  async getLowStockItems(pharmacyId: string, ctx: RequestContext) {
    // Verify pharmacy access
    await this.verifyPharmacyAccess(pharmacyId, ctx);

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

  async getExpiringStock(pharmacyId: string, ctx: RequestContext, daysThreshold = 90) {
    // Verify pharmacy access
    await this.verifyPharmacyAccess(pharmacyId, ctx);

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

  async removeExpiredStock(pharmacyId: string, userId: number, ctx: RequestContext) {
    // Verify pharmacy access
    await this.verifyPharmacyAccess(pharmacyId, ctx);

    return await this.dataSource.transaction(async (manager) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find expired stock with quantity > 0 using efficient query
      const expiredBatches = await manager
        .createQueryBuilder(PharmacyStock, 'stock')
        .where('stock.pharmacyId = :pharmacyId', { pharmacyId })
        .andWhere('stock.expiryDate < :today', { today })
        .andWhere('stock.quantity > 0')
        .getMany();

      if (expiredBatches.length === 0) {
        return {
          success: true,
          message: 'No expired stock found',
          removed: [],
        };
      }

      const movements: StockMovement[] = [];
      const now = new Date();
      const fiscalYear = this.getFiscalYear(now);
      const fiscalPeriod = this.getFiscalPeriod(now);

      for (const batch of expiredBatches) {
        const quantityToRemove = Number(batch.quantity);
        const valuationRate = Number(batch.costPrice);
        const stockValueDifference = -quantityToRemove * valuationRate;

        // Get previous stock value
        const previousMovements = await manager.find(StockMovement, {
          where: {
            pharmacyId,
            drugId: batch.drugId,
            batchNumber: batch.batchNumber,
          },
          order: { createdAt: 'DESC' },
          take: 1,
        });

        const previousStockValue =
          previousMovements.length > 0 && previousMovements[0].stockValue
            ? Number(previousMovements[0].stockValue)
            : 0;

        const newStockValue = previousStockValue + stockValueDifference;

        // Create expiry movement with valuation
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
          // Valuation tracking
          valuationRate,
          stockValue: newStockValue,
          stockValueDifference,
          postingDateTime: now,
          fiscalYear,
          fiscalPeriod,
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

  async transferStock(dto: TransferStockDto, userId: number, ctx: RequestContext) {
    // Verify pharmacy access for both source and destination
    await this.verifyPharmacyAccess(dto.fromPharmacyId, ctx);
    await this.verifyPharmacyAccess(dto.toPharmacyId, ctx);

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

      const now = new Date();
      const fiscalYear = this.getFiscalYear(now);
      const fiscalPeriod = this.getFiscalPeriod(now);

      // 3. Calculate valuation for TRANSFER_OUT
      const valuationRate = Number(sourceStock.costPrice);
      const stockValueDifference = -dto.quantity * valuationRate;

      const previousMovementsOut = await manager.find(StockMovement, {
        where: {
          pharmacyId: dto.fromPharmacyId,
          drugId: dto.drugId,
          batchNumber: dto.batchNumber,
        },
        order: { createdAt: 'DESC' },
        take: 1,
      });

      const previousStockValueOut =
        previousMovementsOut.length > 0 && previousMovementsOut[0].stockValue
          ? Number(previousMovementsOut[0].stockValue)
          : 0;

      const newStockValueOut = previousStockValueOut + stockValueDifference;

      // 4. Create TRANSFER_OUT movement with valuation
      const transferOutMovement = manager.create(StockMovement, {
        type: StockMovementType.TRANSFER_OUT,
        pharmacyId: dto.fromPharmacyId,
        drugId: dto.drugId,
        batchNumber: dto.batchNumber,
        quantity: -dto.quantity,
        balanceAfter: Number(sourceStock.quantity),
        referenceType: 'inter_pharmacy_transfer',
        referenceNumber: `TO-${dto.toPharmacyId}`,
        userId: userId,
        metadata: {
          toPharmacyId: dto.toPharmacyId,
        },
        // Valuation tracking
        valuationRate,
        stockValue: newStockValueOut,
        stockValueDifference,
        postingDateTime: now,
        fiscalYear,
        fiscalPeriod,
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

      // 6. Calculate valuation for TRANSFER_IN
      const stockValueDifferenceIn = dto.quantity * valuationRate;

      const previousMovementsIn = await manager.find(StockMovement, {
        where: {
          pharmacyId: dto.toPharmacyId,
          drugId: dto.drugId,
          batchNumber: dto.batchNumber,
        },
        order: { createdAt: 'DESC' },
        take: 1,
      });

      const previousStockValueIn =
        previousMovementsIn.length > 0 && previousMovementsIn[0].stockValue
          ? Number(previousMovementsIn[0].stockValue)
          : 0;

      const newStockValueIn = previousStockValueIn + stockValueDifferenceIn;

      // 7. Create TRANSFER_IN movement with valuation
      const transferInMovement = manager.create(StockMovement, {
        type: StockMovementType.TRANSFER_IN,
        pharmacyId: dto.toPharmacyId,
        drugId: dto.drugId,
        batchNumber: dto.batchNumber,
        quantity: dto.quantity,
        balanceAfter: Number(destStock.quantity),
        referenceType: 'inter_pharmacy_transfer',
        referenceNumber: `FROM-${dto.fromPharmacyId}`,
        userId: userId,
        metadata: {
          fromPharmacyId: dto.fromPharmacyId,
        },
        // Valuation tracking
        valuationRate,
        stockValue: newStockValueIn,
        stockValueDifference: stockValueDifferenceIn,
        postingDateTime: now,
        fiscalYear,
        fiscalPeriod,
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

  async allocateStock(dto: AllocateStockDto, userId: number, ctx: RequestContext) {
    // Verify pharmacy access
    await this.verifyPharmacyAccess(dto.pharmacyId, ctx);

    return await this.dataSource.transaction(async (manager) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Find available batches using FEFO with pessimistic locking
      const availableBatches = await manager
        .createQueryBuilder(PharmacyStock, 'stock')
        .setLock('pessimistic_write')
        .where('stock.pharmacyId = :pharmacyId', { pharmacyId: dto.pharmacyId })
        .andWhere('stock.drugId = :drugId', { drugId: dto.drugId })
        .andWhere('stock.isQuarantined = false')
        .andWhere('stock.expiryDate >= :today', { today })
        .andWhere('stock.quantity > stock.allocatedQuantity')
        .orderBy('stock.expiryDate', 'ASC')
        .getMany();

      if (availableBatches.length === 0) {
        throw new NotFoundException(
          `No available stock found for drug ${dto.drugId} in pharmacy ${dto.pharmacyId}`,
        );
      }

      // 2. Calculate total available (unallocated) stock
      const totalAvailable = availableBatches.reduce(
        (sum, batch) =>
          sum + (Number(batch.quantity) - Number(batch.allocatedQuantity)),
        0,
      );

      if (totalAvailable < dto.quantity) {
        throw new BadRequestException(
          `Insufficient unallocated stock. Requested: ${dto.quantity}, Available: ${totalAvailable}`,
        );
      }

      // 3. Allocate from batches in FEFO order
      let remainingQty = dto.quantity;
      const movements: StockMovement[] = [];
      const now = new Date();
      const fiscalYear = this.getFiscalYear(now);
      const fiscalPeriod = this.getFiscalPeriod(now);

      for (const batch of availableBatches) {
        if (remainingQty <= 0) break;

        const availableInBatch =
          Number(batch.quantity) - Number(batch.allocatedQuantity);
        const qtyToAllocate = Math.min(remainingQty, availableInBatch);

        // Update allocated quantity
        batch.allocatedQuantity =
          Number(batch.allocatedQuantity) + qtyToAllocate;
        await manager.save(PharmacyStock, batch);

        // Get previous stock value (allocation doesn't change value, just copy it)
        const previousMovements = await manager.find(StockMovement, {
          where: {
            pharmacyId: dto.pharmacyId,
            drugId: dto.drugId,
            batchNumber: batch.batchNumber,
          },
          order: { createdAt: 'DESC' },
          take: 1,
        });

        const previousStockValue =
          previousMovements.length > 0 && previousMovements[0].stockValue
            ? Number(previousMovements[0].stockValue)
            : 0;

        const valuationRate = Number(batch.costPrice);

        // Create allocation movement (doesn't change quantity or value, only allocatedQuantity)
        const movement = manager.create(StockMovement, {
          type: StockMovementType.ALLOCATION,
          pharmacyId: dto.pharmacyId,
          drugId: dto.drugId,
          batchNumber: batch.batchNumber,
          quantity: 0, // Allocation doesn't change physical quantity
          balanceAfter: Number(batch.quantity),
          referenceType: dto.referenceType,
          referenceNumber: dto.referenceNumber,
          userId,
          notes: dto.notes,
          metadata: {
            allocatedQuantity: qtyToAllocate,
            expiryDate: batch.expiryDate,
          },
          // Valuation tracking (no change in stock value for allocation)
          valuationRate,
          stockValue: previousStockValue,
          stockValueDifference: 0,
          postingDateTime: now,
          fiscalYear,
          fiscalPeriod,
        });

        await manager.save(StockMovement, movement);
        movements.push(movement);

        remainingQty -= qtyToAllocate;
      }

      return {
        success: true,
        message: `Allocated ${dto.quantity} units successfully`,
        movements,
      };
    });
  }

  async releaseStock(dto: ReleaseStockDto, userId: number, ctx: RequestContext) {
    // Verify pharmacy access
    await this.verifyPharmacyAccess(dto.pharmacyId, ctx);

    return await this.dataSource.transaction(async (manager) => {
      // 1. Find allocated batches with pessimistic locking
      const allocatedBatches = await manager
        .createQueryBuilder(PharmacyStock, 'stock')
        .setLock('pessimistic_write')
        .where('stock.pharmacyId = :pharmacyId', { pharmacyId: dto.pharmacyId })
        .andWhere('stock.drugId = :drugId', { drugId: dto.drugId })
        .andWhere('stock.allocatedQuantity > 0')
        .orderBy('stock.expiryDate', 'ASC')
        .getMany();

      if (allocatedBatches.length === 0) {
        throw new NotFoundException(
          `No allocated stock found for drug ${dto.drugId} in pharmacy ${dto.pharmacyId}`,
        );
      }

      // 2. Calculate total allocated stock
      const totalAllocated = allocatedBatches.reduce(
        (sum, batch) => sum + Number(batch.allocatedQuantity),
        0,
      );

      if (totalAllocated < dto.quantity) {
        throw new BadRequestException(
          `Insufficient allocated stock. Requested release: ${dto.quantity}, Total allocated: ${totalAllocated}`,
        );
      }

      // 3. Release from batches in FEFO order
      let remainingQty = dto.quantity;
      const movements: StockMovement[] = [];
      const now = new Date();
      const fiscalYear = this.getFiscalYear(now);
      const fiscalPeriod = this.getFiscalPeriod(now);

      for (const batch of allocatedBatches) {
        if (remainingQty <= 0) break;

        const allocatedInBatch = Number(batch.allocatedQuantity);
        const qtyToRelease = Math.min(remainingQty, allocatedInBatch);

        // Update allocated quantity
        batch.allocatedQuantity = allocatedInBatch - qtyToRelease;
        await manager.save(PharmacyStock, batch);

        // Get previous stock value (release doesn't change value, just copy it)
        const previousMovements = await manager.find(StockMovement, {
          where: {
            pharmacyId: dto.pharmacyId,
            drugId: dto.drugId,
            batchNumber: batch.batchNumber,
          },
          order: { createdAt: 'DESC' },
          take: 1,
        });

        const previousStockValue =
          previousMovements.length > 0 && previousMovements[0].stockValue
            ? Number(previousMovements[0].stockValue)
            : 0;

        const valuationRate = Number(batch.costPrice);

        // Create release movement (doesn't change quantity or value, only allocatedQuantity)
        const movement = manager.create(StockMovement, {
          type: StockMovementType.RELEASE,
          pharmacyId: dto.pharmacyId,
          drugId: dto.drugId,
          batchNumber: batch.batchNumber,
          quantity: 0, // Release doesn't change physical quantity
          balanceAfter: Number(batch.quantity),
          referenceType: dto.referenceType,
          referenceNumber: dto.referenceNumber,
          userId,
          notes: dto.reason,
          metadata: {
            releasedQuantity: qtyToRelease,
            expiryDate: batch.expiryDate,
          },
          // Valuation tracking (no change in stock value for release)
          valuationRate,
          stockValue: previousStockValue,
          stockValueDifference: 0,
          postingDateTime: now,
          fiscalYear,
          fiscalPeriod,
        });

        await manager.save(StockMovement, movement);
        movements.push(movement);

        remainingQty -= qtyToRelease;
      }

      return {
        success: true,
        message: `Released ${dto.quantity} units successfully`,
        movements,
      };
    });
  }

  /**
   * Reconcile pharmacy stock - verify PharmacyStock.quantity matches ledger (ERPNext-inspired)
   * This compares the current state (PharmacyStock) with the ledger (StockMovement history)
   */
  async reconcilePharmacyStock(
    pharmacyId: string,
    userId: number,
    ctx: RequestContext,
  ) {
    await this.verifyPharmacyAccess(pharmacyId, ctx);

    return await this.dataSource.transaction(async (manager) => {
      const stocks = await manager.find(PharmacyStock, {
        where: { pharmacyId },
      });

      const discrepancies: any[] = [];
      const adjustments: StockMovement[] = [];

      for (const stock of stocks) {
        // Calculate ledger balance by summing all movements
        const movements = await manager.find(StockMovement, {
          where: {
            pharmacyId,
            drugId: stock.drugId,
            batchNumber: stock.batchNumber,
          },
          order: { createdAt: 'ASC' },
        });

        const ledgerBalance = movements.reduce(
          (sum, m) => sum + Number(m.quantity),
          0,
        );
        const stateBalance = Number(stock.quantity);

        if (Math.abs(ledgerBalance - stateBalance) > 0.01) {
          // Discrepancy found
          discrepancies.push({
            drugId: stock.drugId,
            batchNumber: stock.batchNumber,
            ledgerBalance,
            stateBalance,
            difference: ledgerBalance - stateBalance,
          });

          // Create adjustment to fix discrepancy
          const adjustmentQuantity = ledgerBalance - stateBalance;
          stock.quantity = ledgerBalance;
          await manager.save(PharmacyStock, stock);

          // Calculate valuation
          const valuationRate = Number(stock.costPrice);
          const stockValueDifference = adjustmentQuantity * valuationRate;

          const previousMovements = await manager.find(StockMovement, {
            where: {
              pharmacyId,
              drugId: stock.drugId,
              batchNumber: stock.batchNumber,
            },
            order: { createdAt: 'DESC' },
            take: 1,
          });

          const previousStockValue =
            previousMovements.length > 0 && previousMovements[0].stockValue
              ? Number(previousMovements[0].stockValue)
              : 0;

          const newStockValue = previousStockValue + stockValueDifference;

          const now = new Date();
          const fiscalYear = this.getFiscalYear(now);
          const fiscalPeriod = this.getFiscalPeriod(now);

          const movement = manager.create(StockMovement, {
            type: StockMovementType.ADJUSTMENT,
            pharmacyId,
            drugId: stock.drugId,
            batchNumber: stock.batchNumber,
            quantity: adjustmentQuantity,
            balanceAfter: ledgerBalance,
            referenceType: 'ledger_reconciliation',
            userId,
            notes: `Reconciliation: Ledger=${ledgerBalance}, State=${stateBalance}`,
            metadata: {
              oldQuantity: stateBalance,
              newQuantity: ledgerBalance,
              reconciliationType: 'automatic',
            },
            valuationRate,
            stockValue: newStockValue,
            stockValueDifference,
            postingDateTime: now,
            fiscalYear,
            fiscalPeriod,
          });

          await manager.save(StockMovement, movement);
          adjustments.push(movement);
        }
      }

      return {
        success: true,
        message:
          discrepancies.length > 0
            ? `Found and fixed ${discrepancies.length} discrepancies`
            : 'No discrepancies found',
        discrepancies,
        adjustments,
      };
    });
  }

  /**
   * Get stock valuation report for a pharmacy (ERPNext-inspired)
   */
  async getStockValuationReport(pharmacyId: string, ctx: RequestContext) {
    await this.verifyPharmacyAccess(pharmacyId, ctx);

    const stocks = await this.pharmacyStockRepository.find({
      where: { pharmacyId },
      order: { drugId: 'ASC', batchNumber: 'ASC' },
    });

    const valuationData = [];
    let totalStockValue = 0;

    for (const stock of stocks) {
      const quantity = Number(stock.quantity);
      const costPrice = Number(stock.costPrice);
      const sellingPrice = Number(stock.sellingPrice);
      const stockValue = quantity * costPrice;
      const potentialRevenue = quantity * sellingPrice;
      const potentialProfit = potentialRevenue - stockValue;

      totalStockValue += stockValue;

      valuationData.push({
        drugId: stock.drugId,
        batchNumber: stock.batchNumber,
        quantity,
        allocatedQuantity: Number(stock.allocatedQuantity),
        availableQuantity: quantity - Number(stock.allocatedQuantity),
        costPrice,
        sellingPrice,
        stockValue,
        potentialRevenue,
        potentialProfit,
        profitMargin: stockValue > 0 ? (potentialProfit / stockValue) * 100 : 0,
        expiryDate: stock.expiryDate,
        isExpiringSoon: stock.isExpiringSoon,
      });
    }

    return {
      pharmacyId,
      totalStockValue,
      totalPotentialRevenue: valuationData.reduce(
        (sum, item) => sum + item.potentialRevenue,
        0,
      ),
      totalPotentialProfit: valuationData.reduce(
        (sum, item) => sum + item.potentialProfit,
        0,
      ),
      averageProfitMargin:
        totalStockValue > 0
          ? (valuationData.reduce((sum, item) => sum + item.potentialProfit, 0) /
              totalStockValue) *
            100
          : 0,
      items: valuationData,
      generatedAt: new Date(),
    };
  }
}
