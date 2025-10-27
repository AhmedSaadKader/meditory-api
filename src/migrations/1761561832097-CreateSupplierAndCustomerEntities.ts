import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupplierAndCustomerEntities1761561832097
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create supplier_type enum (ERPNext field)
    await queryRunner.query(`
      CREATE TYPE "operational"."supplier_type" AS ENUM (
        'COMPANY',
        'INDIVIDUAL',
        'PARTNERSHIP'
      )
    `);

    // Create suppliers table (ERPNext-inspired)
    await queryRunner.query(`
      CREATE TABLE "operational"."suppliers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "code" VARCHAR(100) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "address" TEXT,
        "phone" VARCHAR(50),
        "email" VARCHAR(100),
        "contact_person" VARCHAR(100),
        "supplier_type" "operational"."supplier_type" NOT NULL DEFAULT 'COMPANY',
        "current_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
        "payment_terms" JSON,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "notes" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_supplier_organization" FOREIGN KEY ("organization_id")
          REFERENCES "operational"."organizations"("id") ON DELETE CASCADE
      )
    `);

    // Create unique index on organizationId + code
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_suppliers_org_code"
      ON "operational"."suppliers" ("organization_id", "code")
    `);

    // Create index on organizationId for filtering
    await queryRunner.query(`
      CREATE INDEX "idx_suppliers_organization_id"
      ON "operational"."suppliers" ("organization_id")
    `);

    // Create customer_type enum
    await queryRunner.query(`
      CREATE TYPE "operational"."customer_type" AS ENUM (
        'WALK_IN',
        'REGISTERED',
        'INSURANCE',
        'CREDIT'
      )
    `);

    // Create customers table (ERPNext + Vendure hybrid)
    await queryRunner.query(`
      CREATE TABLE "operational"."customers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "code" VARCHAR(100),
        "name" VARCHAR(255) NOT NULL,
        "address" TEXT,
        "phone" VARCHAR(50),
        "email" VARCHAR(100),
        "type" "operational"."customer_type" NOT NULL DEFAULT 'WALK_IN',
        "current_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
        "credit_limit" DECIMAL(15,2),
        "insurance_provider" VARCHAR(100),
        "insurance_policy_number" VARCHAR(100),
        "insurance_coverage_percentage" DECIMAL(5,2),
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "notes" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_customer_organization" FOREIGN KEY ("organization_id")
          REFERENCES "operational"."organizations"("id") ON DELETE CASCADE
      )
    `);

    // Create partial unique index on organizationId + code (only when code is not null)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_customers_org_code"
      ON "operational"."customers" ("organization_id", "code")
      WHERE "code" IS NOT NULL
    `);

    // Create index on organizationId for filtering
    await queryRunner.query(`
      CREATE INDEX "idx_customers_organization_id"
      ON "operational"."customers" ("organization_id")
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE "operational"."suppliers" IS 'Suppliers for purchase orders (ERPNext-inspired)'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "operational"."customers" IS 'Customers for sales invoices (ERPNext + Vendure hybrid)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "operational"."suppliers"."current_balance" IS 'Accounts Payable balance (what we owe supplier)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "operational"."customers"."current_balance" IS 'Accounts Receivable balance (what customer owes us)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "operational"."customers" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "operational"."suppliers" CASCADE`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "operational"."customer_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "operational"."supplier_type"`);
  }
}
