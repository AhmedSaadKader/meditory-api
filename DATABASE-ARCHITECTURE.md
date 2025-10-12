# Database Architecture for Meditory Pharmacy ERP

## Current State

- Single PostgreSQL database: `meditory_local`
- All tables in `public` schema
- Drug catalog with advanced search

## Recommended Architecture

### Strategy: Multi-Schema Single Database

```
PostgreSQL Database: meditory_erp
│
├── Schema: reference (Reference/Master Data - Read-Heavy)
│   ├── drugs                    # Main drug catalog
│   ├── ingredients              # Active ingredients
│   ├── ingredient_synonyms      # Alternative names
│   ├── ingredient_groups        # Drug classifications
│   ├── dosage_forms            # Tablet, Capsule, etc.
│   ├── routes                  # Oral, IV, etc.
│   ├── therapeutic_categories  # Analgesic, Antibiotic, etc.
│   ├── companies               # Manufacturers
│   ├── drug_interactions       # Drug-drug interactions
│   ├── allergy_rules           # Allergy checking rules
│   ├── contraindications       # Age/disease restrictions
│   └── dosage_guidelines       # Clinical guidelines
│
└── Schema: operational (Transactional/Operational - Write-Heavy)
    ├── users                   # System users (pharmacists, techs)
    ├── roles                   # User roles
    ├── permissions             # Granular permissions
    ├── patients                # Patient records
    ├── patient_allergies       # Allergy records
    ├── patient_insurance       # Insurance info
    ├── prescriptions           # Rx records
    ├── inventory_lots          # Stock with lot/expiry
    ├── sales                   # Point of sale transactions
    ├── sale_items              # Line items
    ├── suppliers               # Drug suppliers
    ├── purchase_orders         # PO to suppliers
    ├── purchase_order_items    # PO line items
    └── audit_logs              # Compliance tracking
```

---

## Why This Approach?

### ✅ Advantages

1. **Logical Separation**
   - **Reference schema:** Master data, rarely changes, shared across system
   - **Operational schema:** Daily operations, high-frequency changes
   - Clear boundary between static reference and dynamic transactional data

2. **Performance Optimization**
   - Reference schema: optimized for reads, full-text search, complex joins
   - Operational schema: optimized for writes, transactions, updates

3. **Security**
   - Different PostgreSQL roles for different schemas
   - Read-only access to reference data for most users
   - Strict write access to operational data

4. **Data Management**
   - Reference data can be updated from external sources (drug databases)
   - Can reload reference data without affecting transactions
   - Easier to seed/test with reference data

5. **Still Simple**
   - Single database connection
   - Can join across schemas when needed
   - Single backup/restore
   - No distributed transaction complexity

---

## Implementation

### Step 1: Create Schemas

```sql
-- Create schemas
CREATE SCHEMA IF NOT EXISTS reference;
CREATE SCHEMA IF NOT EXISTS operational;

-- Grant permissions
GRANT USAGE ON SCHEMA reference TO pharmacy_app;
GRANT USAGE ON SCHEMA operational TO pharmacy_app;

GRANT SELECT ON ALL TABLES IN SCHEMA reference TO pharmacy_app;
GRANT ALL ON ALL TABLES IN SCHEMA operational TO pharmacy_app;

-- Future permissions (when adding write access to reference)
-- GRANT INSERT, UPDATE ON reference.drugs TO pharmacy_admin;
```

### Step 2: Update Entities

```typescript
// Reference schema entities (master data)
@Entity({ schema: 'reference', name: 'drugs' })
export class Drug {
  @PrimaryGeneratedColumn()
  drug_id: number;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  // ... other fields
}

@Entity({ schema: 'reference', name: 'dosage_forms' })
export class DosageForm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}

@Entity({ schema: 'reference', name: 'drug_interactions' })
export class DrugInteraction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Drug)
  drug_a: Drug;

  @ManyToOne(() => Drug)
  drug_b: Drug;

  @Column()
  severity: string; // major, moderate, minor

  @Column('text')
  description: string;
}

// Operational schema entities (transactional data)
@Entity({ schema: 'operational', name: 'prescriptions' })
export class Prescription {
  @PrimaryGeneratedColumn()
  prescription_id: number;

  // Reference to reference.drugs (cross-schema foreign key)
  @ManyToOne(() => Drug)
  @JoinColumn({ name: 'drug_id' })
  drug: Drug;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column()
  quantity: number;

  @Column()
  refills_authorized: number;

  // ... other fields
}

@Entity({ schema: 'operational', name: 'patients' })
export class Patient {
  @PrimaryGeneratedColumn()
  patient_id: number;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  // ... other fields
}

@Entity({ schema: 'operational', name: 'inventory_lots' })
export class InventoryLot {
  @PrimaryGeneratedColumn()
  lot_id: number;

  @ManyToOne(() => Drug)
  @JoinColumn({ name: 'drug_id' })
  drug: Drug;

  @Column()
  lot_number: string;

  @Column()
  expiry_date: Date;

  @Column()
  quantity: number;

  // ... other fields
}
```

### Step 3: TypeORM Configuration

```typescript
// app.module.ts
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [
    // Reference entities
    Drug,
    DosageForm,
    Route,
    DrugInteraction,
    // Operational entities
    User,
    Patient,
    Prescription,
    InventoryLot,
    Sale,
    // ...
  ],
  synchronize: false, // Always use migrations
  logging: process.env.NODE_ENV === 'development',
});
```

### Step 4: Migrations

```typescript
// migrations/1-create-schemas.ts
export class CreateSchemas1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS reference`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS operational`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA IF EXISTS operational CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS reference CASCADE`);
  }
}

// migrations/2-move-existing-tables.ts
export class MoveExistingTables1234567891 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Move existing drugs table to reference schema
    await queryRunner.query(
      `ALTER TABLE IF EXISTS public.drugs SET SCHEMA reference`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS public.dosage_forms SET SCHEMA reference`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS public.routes SET SCHEMA reference`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE reference.routes SET SCHEMA public`);
    await queryRunner.query(
      `ALTER TABLE reference.dosage_forms SET SCHEMA public`,
    );
    await queryRunner.query(`ALTER TABLE reference.drugs SET SCHEMA public`);
  }
}
```

---

## Module Organization

```
src/
├── reference/                  # Reference data module (master data)
│   ├── drugs/
│   │   ├── drugs.module.ts
│   │   ├── drugs.controller.ts
│   │   ├── drugs.service.ts
│   │   └── entities/drug.entity.ts
│   ├── clinical/
│   │   ├── interactions/      # Drug interactions
│   │   ├── contraindications/ # Clinical rules
│   │   └── allergies/         # Allergy rules
│   ├── reference-data/
│   │   ├── dosage-forms/
│   │   ├── routes/
│   │   └── companies/
│   └── reference.module.ts
│
└── operational/                # Operational/transactional module
    ├── auth/                   # Authentication & users
    ├── prescriptions/
    ├── patients/
    ├── inventory/
    ├── sales/
    ├── procurement/
    └── operational.module.ts
```

---

## Performance Optimizations

### Reference Schema (Read-Heavy, Search-Optimized)

```sql
-- Full-text search indexes
CREATE INDEX idx_drugs_name_gin ON reference.drugs
  USING gin(to_tsvector('english', name));

CREATE INDEX idx_drugs_active_gin ON reference.drugs
  USING gin(to_tsvector('english', active_raw));

-- Covering indexes for common queries
CREATE INDEX idx_drugs_lookup ON reference.drugs
  (drug_id, name, price, dosage_form, route);

-- Partial indexes
CREATE INDEX idx_drugs_available ON reference.drugs (drug_id)
  WHERE price > 0;

-- For drug interactions lookup
CREATE INDEX idx_interactions_drug_a ON reference.drug_interactions (drug_a_id);
CREATE INDEX idx_interactions_drug_b ON reference.drug_interactions (drug_b_id);
CREATE INDEX idx_interactions_both ON reference.drug_interactions (drug_a_id, drug_b_id);
```

### Operational Schema (Write-Heavy, Transaction-Optimized)

```sql
-- Foreign keys with indexes
CREATE INDEX idx_prescriptions_patient ON operational.prescriptions (patient_id);
CREATE INDEX idx_prescriptions_drug ON operational.prescriptions (drug_id);

-- Date range queries
CREATE INDEX idx_prescriptions_date ON operational.prescriptions
  (prescribed_date DESC);

-- Status filtering (partial index)
CREATE INDEX idx_prescriptions_active ON operational.prescriptions (status)
  WHERE status IN ('pending', 'filled');

-- Inventory lot tracking
CREATE INDEX idx_inventory_drug_expiry ON operational.inventory_lots
  (drug_id, expiry_date);

-- Sales queries
CREATE INDEX idx_sales_date ON operational.sales (sale_date DESC);
CREATE INDEX idx_sales_patient ON operational.sales (patient_id);
```

---

## Data Access Patterns

### Reference Data (Read-Only for Most Users)

```typescript
// Service for reference data
@Injectable()
export class DrugsService {
  // Mostly read operations
  findAll() {}
  findOne(id) {}
  search(query) {}

  // Write operations restricted to admins
  @RequirePermission('ManageDrugCatalog')
  create(dto) {}

  @RequirePermission('ManageDrugCatalog')
  update(id, dto) {}
}
```

### Operational Data (Frequent Writes)

```typescript
// Service for operational data
@Injectable()
export class PrescriptionsService {
  // High-frequency operations
  create(dto) {}
  fill(id) {}
  refill(id) {}
  cancel(id) {}

  // Joins to reference data when needed
  async createWithValidation(dto) {
    const drug = await this.drugsService.findOne(dto.drugId);
    const interactions = await this.checkInteractions(drug);
    // ...
  }
}
```

---

## Migration Path

### Phase 1: Current → Multi-Schema (This Week)

```bash
# 1. Create migration
npm run typeorm migration:create src/migrations/CreateSchemas

# 2. Run migration
npm run typeorm migration:run

# 3. Update entities with schema property

# 4. Test all existing functionality
```

### Phase 2: Add Operational Tables (Next 3 Months)

- Add users, patients, prescriptions as you build features
- All go into `operational` schema

### Phase 3: Optimize (Month 3-6)

- Add indexes based on actual usage patterns
- Monitor slow queries
- Add materialized views if needed

---

## Future Scaling Options

### When to Add Search Engine?

**Add Typesense/Meilisearch when:**

- PostgreSQL search becomes slow (>500ms)
- Need typo tolerance
- Need instant search (<50ms)
- Want advanced faceting

**Easy to add later - just sync on changes:**

```typescript
@Injectable()
export class DrugsService {
  async create(dto: CreateDrugDto) {
    const drug = await this.repo.save(dto);
    await this.searchService.indexDrug(drug); // Add this line
    return drug;
  }
}
```

### When to Separate Databases?

**Consider separate databases when:**

- Reference data grows to 500K+ items
- Need geographic distribution
- Different backup/recovery requirements
- Search load impacts transactional performance

---

## Summary

### **Two Schemas:**

| Schema          | Purpose                     | Access Pattern                 | Examples                               |
| --------------- | --------------------------- | ------------------------------ | -------------------------------------- |
| **reference**   | Master data, clinical rules | Read-heavy (95% reads)         | drugs, interactions, contraindications |
| **operational** | Daily operations            | Write-heavy (50/50 read-write) | prescriptions, sales, inventory        |

### **Benefits:**

- ✅ Clear separation of concerns
- ✅ Independent optimization strategies
- ✅ Security: restrict write access to reference data
- ✅ Easier data management (can reload reference data)
- ✅ Still simple (single database, single connection)

### **Next Steps:**

1. Create the two schemas
2. Move existing drug tables to `reference` schema
3. Build new features in `operational` schema
4. Monitor and optimize

**This gives you the organization benefits without complexity!**
