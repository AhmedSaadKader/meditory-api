import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockCheckConstraints1761481382052 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add CHECK constraints to ensure data integrity at database level
    
    // 1. Prevent negative quantities
    await queryRunner.query(`
      ALTER TABLE operational.pharmacy_stock
        ADD CONSTRAINT check_quantity_non_negative
        CHECK (quantity >= 0)
    `);

    // 2. Prevent negative allocated quantities
    await queryRunner.query(`
      ALTER TABLE operational.pharmacy_stock
        ADD CONSTRAINT check_allocated_non_negative
        CHECK (allocated_quantity >= 0)
    `);

    // 3. Prevent over-allocation (allocated quantity cannot exceed total quantity)
    await queryRunner.query(`
      ALTER TABLE operational.pharmacy_stock
        ADD CONSTRAINT check_allocated_within_quantity
        CHECK (allocated_quantity <= quantity)
    `);

    // 4. Ensure cost price and selling price are positive
    await queryRunner.query(`
      ALTER TABLE operational.pharmacy_stock
        ADD CONSTRAINT check_cost_price_positive
        CHECK (cost_price >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE operational.pharmacy_stock
        ADD CONSTRAINT check_selling_price_positive
        CHECK (selling_price >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove CHECK constraints
    await queryRunner.query(`
      ALTER TABLE operational.pharmacy_stock
        DROP CONSTRAINT IF EXISTS check_selling_price_positive
    `);

    await queryRunner.query(`
      ALTER TABLE operational.pharmacy_stock
        DROP CONSTRAINT IF EXISTS check_cost_price_positive
    `);

    await queryRunner.query(`
      ALTER TABLE operational.pharmacy_stock
        DROP CONSTRAINT IF EXISTS check_allocated_within_quantity
    `);

    await queryRunner.query(`
      ALTER TABLE operational.pharmacy_stock
        DROP CONSTRAINT IF EXISTS check_allocated_non_negative
    `);

    await queryRunner.query(`
      ALTER TABLE operational.pharmacy_stock
        DROP CONSTRAINT IF EXISTS check_quantity_non_negative
    `);
  }
}
