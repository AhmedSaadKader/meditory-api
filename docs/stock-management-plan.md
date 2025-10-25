# Stock Management System Design

## Executive Summary

This document outlines the proposed stock management system for the pharmacy ERP, drawing insights from Vendure's inventory management architecture while adapting it for pharmacy-specific requirements.

## How Vendure Handles Inventory

### Core Entities

#### 1. ProductVariant (SKU Level)
```typescript
@Entity()
export class ProductVariant {
  @Column()
  sku: string;

  @Column({ default: 0 })
  outOfStockThreshold: number;

  @Column({ default: true })
  useGlobalOutOfStockThreshold: boolean;

  @Column({ type: 'varchar', default: GlobalFlag.INHERIT })
  trackInventory: GlobalFlag;

  @OneToMany(type => StockLevel, stockLevel => stockLevel.productVariant)
  stockLevels: StockLevel[];

  @OneToMany(type => StockMovement, stockMovement => stockMovement.productVariant)
  stockMovements: StockMovement[];

  @ManyToOne(type => Product)
  product: Product;
}
```

**Key Features:**
- Each variant can have its own stock tracking settings
- Can override global stock thresholds
- Direct relationships to stock levels and movements

#### 2. StockLocation (Warehouses/Locations)
```typescript
@Entity()
export class StockLocation {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(type => StockLevel, stockLevel => stockLevel.stockLocation)
  stockLevels: StockLevel[];

  @OneToMany(type => StockMovement, stockMovement => stockMovement.stockLocation)
  stockMovements: StockMovement[];
}
```

**Purpose:**
- Represents physical locations (warehouses, stores, pharmacies)
- Enables multi-location inventory management
- Each location has independent stock levels

#### 3. StockLevel (Current Inventory State)
```typescript
@Entity()
export class StockLevel {
  @ManyToOne(type => ProductVariant)
  productVariant: ProductVariant;

  @ManyToOne(type => StockLocation)
  stockLocation: StockLocation;

  @Column()
  stockOnHand: number;

  @Column()
  stockAllocated: number;

  // Unique constraint on (productVariant, stockLocation)
}
```

**Key Concepts:**
- `stockOnHand`: Physical inventory available
- `stockAllocated`: Reserved for pending orders
- `stockAvailable = stockOnHand - stockAllocated`
- One record per variant per location

#### 4. StockMovement (Audit Trail)
```typescript
@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'discriminator' } })
export abstract class StockMovement {
  @Column({ nullable: false, type: 'varchar' })
  readonly type: StockMovementType;

  @ManyToOne(type => ProductVariant, variant => variant.stockMovements)
  productVariant: ProductVariant;

  @ManyToOne(type => StockLocation, location => location.stockMovements)
  stockLocation: StockLocation;

  @Column()
  stockLocationId: ID;

  @Column()
  quantity: number; // Positive or negative

  @Column()
  customFields: CustomStockMovementFields;
}
```

**Movement Types (Concrete Classes):**
- `Adjustment`: Manual inventory adjustments
- `Allocation`: Stock reserved for an order
- `Sale`: Stock sold and shipped
- `Cancellation`: Order cancelled, stock returned
- `Release`: Allocated stock released back
- `Return`: Customer returned items

**Design Pattern:**
- Uses TypeORM Table Inheritance (Single Table Inheritance)
- Each movement type is a subclass with additional fields
- Example: `Sale` extends `StockMovement` and adds `orderLine` reference

### Vendure's Workflow Example

**When a customer places an order:**
1. Create `Allocation` movement (-10 quantity)
2. Update StockLevel: `stockAllocated += 10`

**When order is fulfilled:**
1. Create `Sale` movement (references the allocation)
2. Update StockLevel: `stockOnHand -= 10`, `stockAllocated -= 10`

**When order is cancelled:**
1. Create `Cancellation` movement (+10 quantity)
2. Update StockLevel: `stockAllocated -= 10`

**Benefits:**
- Complete audit trail of every stock change
- Can reconstruct stock at any point in time
- Supports complex workflows (allocation → fulfillment)

---

## Proposed Pharmacy ERP Implementation

### Pharmacy-Specific Requirements

Unlike general e-commerce, pharmacies require:

1. **Batch/Lot Tracking**: Track specific batches for recalls
2. **Expiry Management**: FEFO (First Expired, First Out) inventory
3. **Regulatory Compliance**: Complete audit trail with user accountability
4. **Controlled Substances**: Enhanced tracking for scheduled drugs
5. **Multi-Location**: Support for pharmacy chains
6. **Reserved Stock**: For pending prescriptions
7. **Wastage Tracking**: Expired, damaged, or recalled items

### Proposed Schema Structure

#### Schema Organization
- **`reference` schema**: Master drug catalog (read-only reference data)
- **`operational` schema**: Live pharmacy operations including stock

#### 1. Pharmacy Entity (Location)
```typescript
@Entity({ schema: 'operational', name: 'pharmacies' })
export class Pharmacy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  code: string; // Unique pharmacy code

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  licenseNumber: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isMainWarehouse: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PharmacyStock, stock => stock.pharmacy)
  stockLevels: PharmacyStock[];

  @OneToMany(() => StockMovement, movement => movement.pharmacy)
  stockMovements: StockMovement[];
}
```

#### 2. PharmacyStock Entity (Current Inventory)
```typescript
@Entity({ schema: 'operational', name: 'pharmacy_stock' })
@Index(['pharmacy', 'drug'], { unique: false })
@Index(['pharmacy', 'drug', 'batchNumber'], { unique: true })
export class PharmacyStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Pharmacy, pharmacy => pharmacy.stockLevels)
  pharmacy: Pharmacy;

  @Column()
  pharmacyId: string;

  // Reference to drug in reference schema
  @Column()
  drugId: number;

  @Column()
  batchNumber: string; // LOT number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number; // Current available quantity

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  allocatedQuantity: number; // Reserved for pending prescriptions

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minimumStockLevel: number; // Reorder point

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPrice: number; // Purchase price for this batch

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  sellingPrice: number;

  @Column({ nullable: true })
  supplierName: string;

  @Column({ nullable: true })
  supplierInvoiceNumber: string;

  @Column({ type: 'date', nullable: true })
  receivedDate: Date;

  @Column({ default: false })
  isQuarantined: boolean; // For quality control

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get availableQuantity(): number {
    return this.quantity - this.allocatedQuantity;
  }

  get isExpiringSoon(): boolean {
    if (!this.expiryDate) return false;
    const threeMonths = 90 * 24 * 60 * 60 * 1000;
    return (this.expiryDate.getTime() - Date.now()) < threeMonths;
  }

  get isExpired(): boolean {
    if (!this.expiryDate) return false;
    return this.expiryDate < new Date();
  }
}
```

**Key Design Decisions:**
- **Batch-level tracking**: Each batch is a separate record
- **Allocated vs Available**: Support for prescription reservations
- **Expiry tracking**: Critical for pharmacy compliance
- **Cost tracking**: For accurate COGS and profit margins
- **Quarantine flag**: For quality control holds

#### 3. StockMovement Entity (Audit Trail)
```typescript
export enum StockMovementType {
  PURCHASE = 'PURCHASE',           // Receiving from supplier
  SALE = 'SALE',                   // Dispensing to customer
  ADJUSTMENT = 'ADJUSTMENT',       // Manual correction
  RETURN_FROM_CUSTOMER = 'RETURN_FROM_CUSTOMER',
  RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER',
  EXPIRY = 'EXPIRY',              // Expired items removed
  DAMAGE = 'DAMAGE',              // Damaged items removed
  RECALL = 'RECALL',              // Manufacturer recall
  TRANSFER_OUT = 'TRANSFER_OUT',  // To another pharmacy
  TRANSFER_IN = 'TRANSFER_IN',    // From another pharmacy
  ALLOCATION = 'ALLOCATION',      // Reserved for prescription
  RELEASE = 'RELEASE',            // Allocation cancelled
  STOCK_TAKE = 'STOCK_TAKE',      // Physical count adjustment
}

@Entity({ schema: 'operational', name: 'stock_movements' })
@Index(['pharmacy', 'drugId', 'createdAt'])
@Index(['batchNumber', 'createdAt'])
@Index(['type', 'createdAt'])
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: StockMovementType })
  type: StockMovementType;

  @ManyToOne(() => Pharmacy, pharmacy => pharmacy.stockMovements)
  pharmacy: Pharmacy;

  @Column()
  pharmacyId: string;

  @Column()
  drugId: number; // Reference to reference.drugs

  @Column()
  batchNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number; // Positive = increase, Negative = decrease

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balanceAfter: number; // Stock balance after this movement

  @Column({ nullable: true })
  referenceType: string; // 'sale', 'purchase', 'prescription', etc.

  @Column({ nullable: true })
  referenceId: string; // ID of the related transaction

  @Column({ nullable: true })
  referenceNumber: string; // Human-readable reference (invoice#, prescription#)

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  userId: string; // Who performed this action

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Additional context

  @CreateDateColumn()
  createdAt: Date;

  // For transfers
  @Column({ nullable: true })
  relatedPharmacyId: string; // Source/destination pharmacy

  @Column({ nullable: true })
  relatedMovementId: string; // Link TRANSFER_OUT to TRANSFER_IN
}
```

**Key Features:**
- **Immutable audit trail**: Movements are never updated/deleted
- **Dual references**: Links to both transaction (sale/purchase) and batch
- **Balance tracking**: Stores balance after each movement for verification
- **User accountability**: Tracks who made each change
- **Transfer support**: Links paired movements for inter-pharmacy transfers
- **Flexible metadata**: JSON field for movement-specific data

#### 4. Supporting Entities

**Purchase Order & Purchase Items** (not detailed here but would exist):
- When purchase is received → creates PURCHASE movement
- Updates PharmacyStock for each batch received

**Sale/Prescription** (not detailed here but would exist):
- When prescription is filled → creates SALE movement
- Decreases PharmacyStock quantity

---

## Implementation Workflow Examples

### Example 1: Receiving Stock from Supplier

```typescript
async receivePurchase(purchaseData: {
  pharmacyId: string;
  drugId: number;
  batchNumber: string;
  quantity: number;
  expiryDate: Date;
  costPrice: number;
  supplierInvoice: string;
  userId: string;
}) {
  return await this.dataSource.transaction(async (manager) => {
    // 1. Find or create stock record for this batch
    let stock = await manager.findOne(PharmacyStock, {
      where: {
        pharmacyId: purchaseData.pharmacyId,
        drugId: purchaseData.drugId,
        batchNumber: purchaseData.batchNumber,
      },
    });

    if (!stock) {
      stock = manager.create(PharmacyStock, {
        pharmacyId: purchaseData.pharmacyId,
        drugId: purchaseData.drugId,
        batchNumber: purchaseData.batchNumber,
        quantity: 0,
        expiryDate: purchaseData.expiryDate,
        costPrice: purchaseData.costPrice,
        supplierInvoiceNumber: purchaseData.supplierInvoice,
        receivedDate: new Date(),
      });
    }

    // 2. Update stock quantity
    stock.quantity += purchaseData.quantity;
    await manager.save(stock);

    // 3. Create movement record
    const movement = manager.create(StockMovement, {
      type: StockMovementType.PURCHASE,
      pharmacyId: purchaseData.pharmacyId,
      drugId: purchaseData.drugId,
      batchNumber: purchaseData.batchNumber,
      quantity: purchaseData.quantity,
      balanceAfter: stock.quantity,
      referenceType: 'purchase',
      referenceNumber: purchaseData.supplierInvoice,
      userId: purchaseData.userId,
    });
    await manager.save(movement);

    return { stock, movement };
  });
}
```

### Example 2: Dispensing Medication (with FEFO)

```typescript
async dispenseMedication(saleData: {
  pharmacyId: string;
  drugId: number;
  quantity: number;
  prescriptionId: string;
  userId: string;
}) {
  return await this.dataSource.transaction(async (manager) => {
    // 1. Find batches using FEFO (First Expired, First Out)
    const availableBatches = await manager.find(PharmacyStock, {
      where: {
        pharmacyId: saleData.pharmacyId,
        drugId: saleData.drugId,
        isQuarantined: false,
      },
      order: { expiryDate: 'ASC' }, // FEFO logic
    });

    let remainingQty = saleData.quantity;
    const movements = [];

    // 2. Deduct from batches in FEFO order
    for (const batch of availableBatches) {
      if (remainingQty <= 0) break;

      const available = batch.quantity - batch.allocatedQuantity;
      if (available <= 0) continue;

      const toDeduct = Math.min(available, remainingQty);

      // Update stock
      batch.quantity -= toDeduct;
      await manager.save(batch);

      // Create movement
      const movement = manager.create(StockMovement, {
        type: StockMovementType.SALE,
        pharmacyId: saleData.pharmacyId,
        drugId: saleData.drugId,
        batchNumber: batch.batchNumber,
        quantity: -toDeduct, // Negative for decrease
        balanceAfter: batch.quantity,
        referenceType: 'prescription',
        referenceId: saleData.prescriptionId,
        userId: saleData.userId,
      });
      await manager.save(movement);
      movements.push(movement);

      remainingQty -= toDeduct;
    }

    if (remainingQty > 0) {
      throw new Error('Insufficient stock');
    }

    return movements;
  });
}
```

### Example 3: Handling Expired Stock

```typescript
async removeExpiredStock(pharmacyId: string, userId: string) {
  return await this.dataSource.transaction(async (manager) => {
    // Find all expired batches
    const expiredBatches = await manager
      .createQueryBuilder(PharmacyStock, 'stock')
      .where('stock.pharmacyId = :pharmacyId', { pharmacyId })
      .andWhere('stock.expiryDate < :today', { today: new Date() })
      .andWhere('stock.quantity > 0')
      .getMany();

    const movements = [];

    for (const batch of expiredBatches) {
      const expiredQty = batch.quantity;

      // Remove from stock
      batch.quantity = 0;
      await manager.save(batch);

      // Create expiry movement
      const movement = manager.create(StockMovement, {
        type: StockMovementType.EXPIRY,
        pharmacyId,
        drugId: batch.drugId,
        batchNumber: batch.batchNumber,
        quantity: -expiredQty,
        balanceAfter: 0,
        userId,
        notes: `Expired on ${batch.expiryDate.toISOString().split('T')[0]}`,
      });
      await manager.save(movement);
      movements.push(movement);
    }

    return movements;
  });
}
```

### Example 4: Inter-Pharmacy Transfer

```typescript
async transferStock(transferData: {
  fromPharmacyId: string;
  toPharmacyId: string;
  drugId: number;
  batchNumber: string;
  quantity: number;
  userId: string;
}) {
  return await this.dataSource.transaction(async (manager) => {
    // 1. Deduct from source pharmacy
    const sourceStock = await manager.findOne(PharmacyStock, {
      where: {
        pharmacyId: transferData.fromPharmacyId,
        drugId: transferData.drugId,
        batchNumber: transferData.batchNumber,
      },
    });

    if (!sourceStock || sourceStock.availableQuantity < transferData.quantity) {
      throw new Error('Insufficient stock for transfer');
    }

    sourceStock.quantity -= transferData.quantity;
    await manager.save(sourceStock);

    // 2. Create TRANSFER_OUT movement
    const outMovement = manager.create(StockMovement, {
      type: StockMovementType.TRANSFER_OUT,
      pharmacyId: transferData.fromPharmacyId,
      drugId: transferData.drugId,
      batchNumber: transferData.batchNumber,
      quantity: -transferData.quantity,
      balanceAfter: sourceStock.quantity,
      relatedPharmacyId: transferData.toPharmacyId,
      userId: transferData.userId,
    });
    await manager.save(outMovement);

    // 3. Add to destination pharmacy
    let destStock = await manager.findOne(PharmacyStock, {
      where: {
        pharmacyId: transferData.toPharmacyId,
        drugId: transferData.drugId,
        batchNumber: transferData.batchNumber,
      },
    });

    if (!destStock) {
      destStock = manager.create(PharmacyStock, {
        pharmacyId: transferData.toPharmacyId,
        drugId: transferData.drugId,
        batchNumber: transferData.batchNumber,
        quantity: 0,
        expiryDate: sourceStock.expiryDate,
        costPrice: sourceStock.costPrice,
      });
    }

    destStock.quantity += transferData.quantity;
    await manager.save(destStock);

    // 4. Create TRANSFER_IN movement
    const inMovement = manager.create(StockMovement, {
      type: StockMovementType.TRANSFER_IN,
      pharmacyId: transferData.toPharmacyId,
      drugId: transferData.drugId,
      batchNumber: transferData.batchNumber,
      quantity: transferData.quantity,
      balanceAfter: destStock.quantity,
      relatedPharmacyId: transferData.fromPharmacyId,
      relatedMovementId: outMovement.id,
      userId: transferData.userId,
    });
    await manager.save(inMovement);

    // Link the movements
    outMovement.relatedMovementId = inMovement.id;
    await manager.save(outMovement);

    return { outMovement, inMovement };
  });
}
```

---

## Comparison: Vendure vs Proposed Pharmacy System

| Aspect | Vendure | Pharmacy ERP |
|--------|---------|--------------|
| **Product Entity** | ProductVariant | Drug (reference schema) |
| **Location Entity** | StockLocation | Pharmacy |
| **Current Stock** | StockLevel (variant + location) | PharmacyStock (drug + location + **batch**) |
| **Batch Tracking** | ❌ Not built-in | ✅ Required (batch + expiry) |
| **Stock Allocation** | ✅ stockAllocated field | ✅ allocatedQuantity field |
| **Movement Types** | 6 types (Sale, Allocation, etc.) | 13 types (includes Expiry, Recall, etc.) |
| **Inheritance** | ✅ Table Inheritance | ❌ Single table (simpler) |
| **Movement Reference** | Typed relations (OrderLine, etc.) | Flexible (referenceType + referenceId) |
| **Balance Tracking** | ❌ Calculated | ✅ Stored (balanceAfter) |
| **User Tracking** | ❌ Not in movement | ✅ userId field |
| **Expiry Management** | ❌ N/A | ✅ Core feature |

**Key Differences:**
1. **Batch-centric**: Pharmacy system tracks at batch level, not just variant level
2. **Simpler inheritance**: No table inheritance, uses discriminator column only
3. **Enhanced audit**: Stores balance snapshots and user accountability
4. **Pharmacy-specific movements**: Expiry, damage, recall tracking
5. **FEFO support**: Expiry date ordering for dispensing logic

---

## Advantages of Movement-Based Approach

### 1. **Single Source of Truth**
```sql
-- Current stock calculation
SELECT SUM(quantity) as current_stock
FROM operational.stock_movements
WHERE pharmacy_id = 'xxx'
  AND drug_id = 123
  AND batch_number = 'LOT456';
```

### 2. **Point-in-Time Queries**
```sql
-- Stock as of specific date
SELECT SUM(quantity) as stock_on_date
FROM operational.stock_movements
WHERE pharmacy_id = 'xxx'
  AND drug_id = 123
  AND created_at <= '2024-01-15 23:59:59';
```

### 3. **Comprehensive Audit Trail**
```sql
-- Complete history of a batch
SELECT
  type,
  quantity,
  balance_after,
  reference_number,
  created_at,
  user_id
FROM operational.stock_movements
WHERE batch_number = 'LOT456'
ORDER BY created_at DESC;
```

### 4. **Regulatory Compliance**
- Immutable records (never delete movements)
- User accountability (who made each change)
- Complete transaction history for audits
- Batch recall traceability

### 5. **Performance**
- Indexed movements table vs joining multiple transaction tables
- Pre-computed balances for quick verification
- Efficient queries for stock reports

---

## Data Integrity Strategies

### 1. **Consistency Checks**
```typescript
// Verify movement balance matches actual stock
async verifyStockIntegrity(pharmacyId: string, drugId: number, batch: string) {
  const movementSum = await this.stockMovementRepo
    .createQueryBuilder('m')
    .select('SUM(m.quantity)', 'sum')
    .where('m.pharmacyId = :pharmacyId', { pharmacyId })
    .andWhere('m.drugId = :drugId', { drugId })
    .andWhere('m.batchNumber = :batch', { batch })
    .getRawOne();

  const stock = await this.pharmacyStockRepo.findOne({
    where: { pharmacyId, drugId, batchNumber: batch }
  });

  if (movementSum.sum !== stock?.quantity) {
    throw new Error('Stock integrity violation detected');
  }
}
```

### 2. **Transaction Atomicity**
- Always wrap stock operations in database transactions
- Update PharmacyStock and create StockMovement together
- Rollback both on any failure

### 3. **Constraints**
```typescript
// Database constraints
@Index(['pharmacy', 'drug', 'batchNumber'], { unique: true }) // One record per batch per location
@Check('quantity >= 0') // Cannot have negative stock
@Check('allocated_quantity >= 0')
@Check('allocated_quantity <= quantity') // Cannot allocate more than available
```

---

## Migration Path

### Phase 1: Core Setup
1. Create Pharmacy entity
2. Create PharmacyStock entity
3. Create StockMovement entity with basic types (PURCHASE, SALE, ADJUSTMENT)

### Phase 2: Basic Operations
1. Implement purchase receiving workflow
2. Implement sales/dispensing workflow
3. Add basic stock queries and reports

### Phase 3: Advanced Features
1. Add batch expiry tracking and alerts
2. Implement FEFO logic
3. Add allocation/reservation system for prescriptions
4. Implement inter-pharmacy transfers

### Phase 4: Compliance & Optimization
1. Add controlled substance tracking
2. Implement automatic expiry removal
3. Add stock take/reconciliation features
4. Performance optimization and indexing

---

## Recommended Next Steps

1. **Review & Approve**: Discuss this design with team/stakeholders
2. **Create Migrations**: Generate TypeORM migrations for the three core entities
3. **Build Services**: Implement StockService with basic operations
4. **Add Validations**: Business rules and constraints
5. **Create Reports**: Stock level, movement history, expiry reports
6. **Test Thoroughly**: Unit tests for critical workflows

---

## Conclusion

The proposed stock management system adapts Vendure's proven inventory architecture while adding pharmacy-specific features:

- ✅ **Batch/lot tracking** for regulatory compliance
- ✅ **Expiry management** with FEFO logic
- ✅ **Complete audit trail** with user accountability
- ✅ **Multi-location support** for pharmacy chains
- ✅ **Flexible movement types** for all pharmacy operations

This approach provides a robust foundation that can scale from a single pharmacy to a multi-location enterprise while maintaining data integrity and regulatory compliance.
