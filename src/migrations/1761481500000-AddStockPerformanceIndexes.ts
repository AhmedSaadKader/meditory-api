import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockPerformanceIndexes1761481500000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Composite index for FEFO queries (pharmacy + drug + expiry)
    await queryRunner.query(`
      CREATE INDEX idx_stock_fefo_lookup
      ON operational.pharmacy_stock (pharmacy_id, drug_id, expiry_date)
      WHERE quantity > 0 AND is_quarantined = false
    `);

    // 2. Index for expiry monitoring queries
    await queryRunner.query(`
      CREATE INDEX idx_stock_expiry_monitoring
      ON operational.pharmacy_stock (pharmacy_id, expiry_date)
      WHERE quantity > 0
    `);

    // 3. Index for low stock alerts
    await queryRunner.query(`
      CREATE INDEX idx_stock_low_level
      ON operational.pharmacy_stock (pharmacy_id, minimum_stock_level)
      WHERE is_quarantined = false
    `);

    // 4. Index for stock movements by pharmacy and date (for reporting)
    await queryRunner.query(`
      CREATE INDEX idx_movement_pharmacy_date
      ON operational.stock_movements (pharmacy_id, created_at DESC)
    `);

    // 5. Index for stock movements by drug (for audit trails)
    await queryRunner.query(`
      CREATE INDEX idx_movement_drug_audit
      ON operational.stock_movements (drug_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes in reverse order
    await queryRunner.query(`
      DROP INDEX IF EXISTS operational.idx_movement_drug_audit
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS operational.idx_movement_pharmacy_date
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS operational.idx_stock_low_level
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS operational.idx_stock_expiry_monitoring
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS operational.idx_stock_fefo_lookup
    `);
  }
}
