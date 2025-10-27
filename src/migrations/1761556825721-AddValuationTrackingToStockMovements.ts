import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddValuationTrackingToStockMovements1761556825721
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add valuation tracking fields (ERPNext-inspired)
    await queryRunner.query(`
      ALTER TABLE "operational"."stock_movements"
      ADD COLUMN "valuation_rate" DECIMAL(15,2),
      ADD COLUMN "stock_value" DECIMAL(15,2),
      ADD COLUMN "stock_value_difference" DECIMAL(15,2)
    `);

    // Add posting datetime (separate from created_at for backdating support)
    await queryRunner.query(`
      ALTER TABLE "operational"."stock_movements"
      ADD COLUMN "posting_datetime" TIMESTAMP
    `);

    // Add fiscal period tracking
    await queryRunner.query(`
      ALTER TABLE "operational"."stock_movements"
      ADD COLUMN "fiscal_year" VARCHAR(20),
      ADD COLUMN "fiscal_period" VARCHAR(10)
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX "idx_stock_movements_posting_datetime"
      ON "operational"."stock_movements" ("posting_datetime")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_stock_movements_fiscal_year"
      ON "operational"."stock_movements" ("fiscal_year")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_stock_movements_fiscal_period"
      ON "operational"."stock_movements" ("fiscal_period")
    `);

    // Add comment to document ERPNext inspiration
    await queryRunner.query(`
      COMMENT ON COLUMN "operational"."stock_movements"."valuation_rate" IS 'Cost per unit at time of transaction (ERPNext-inspired)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "operational"."stock_movements"."stock_value" IS 'Total stock value after this transaction (ERPNext-inspired)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "operational"."stock_movements"."stock_value_difference" IS 'Change in stock value from this transaction (ERPNext-inspired)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "operational"."stock_movements"."posting_datetime" IS 'When transaction actually occurred (vs created_at = when recorded)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "operational"."idx_stock_movements_fiscal_period"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "operational"."idx_stock_movements_fiscal_year"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "operational"."idx_stock_movements_posting_datetime"
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "operational"."stock_movements"
      DROP COLUMN IF EXISTS "fiscal_period",
      DROP COLUMN IF EXISTS "fiscal_year",
      DROP COLUMN IF EXISTS "posting_datetime",
      DROP COLUMN IF EXISTS "stock_value_difference",
      DROP COLUMN IF EXISTS "stock_value",
      DROP COLUMN IF EXISTS "valuation_rate"
    `);
  }
}
