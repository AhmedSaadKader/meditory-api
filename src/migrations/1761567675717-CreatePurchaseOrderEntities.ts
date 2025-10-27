import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePurchaseOrderEntities1761567675717 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create purchase_order_status enum
        await queryRunner.query(`
            CREATE TYPE "operational"."purchase_order_status" AS ENUM (
                'DRAFT',
                'SUBMITTED',
                'PARTIALLY_RECEIVED',
                'RECEIVED',
                'COMPLETED',
                'CANCELLED',
                'CLOSED'
            )
        `);

        // Create purchase_orders table
        await queryRunner.query(`
            CREATE TABLE "operational"."purchase_orders" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "organization_id" uuid NOT NULL,
                "code" VARCHAR(100) NOT NULL,
                "supplier_id" uuid NOT NULL,
                "status" "operational"."purchase_order_status" NOT NULL DEFAULT 'DRAFT',
                "order_date" DATE NOT NULL,
                "expected_delivery_date" DATE,
                "pharmacy_id" uuid,
                "total_quantity" DECIMAL(15,2) NOT NULL DEFAULT 0,
                "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
                "total_tax" DECIMAL(15,2) NOT NULL DEFAULT 0,
                "grand_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
                "received_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
                "invoiced_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
                "terms_and_conditions" TEXT,
                "notes" TEXT,
                "amended_from_id" uuid,
                "submitted_by" VARCHAR(255),
                "doc_status" INTEGER NOT NULL DEFAULT 0,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "submitted_at" TIMESTAMP,
                "cancelled_at" TIMESTAMP,
                CONSTRAINT "fk_purchase_order_organization" FOREIGN KEY ("organization_id")
                    REFERENCES "operational"."organizations"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_purchase_order_supplier" FOREIGN KEY ("supplier_id")
                    REFERENCES "operational"."suppliers"("id") ON DELETE RESTRICT,
                CONSTRAINT "fk_purchase_order_amended_from" FOREIGN KEY ("amended_from_id")
                    REFERENCES "operational"."purchase_orders"("id") ON DELETE SET NULL
            )
        `);

        // Create indexes for purchase_orders
        await queryRunner.query(`
            CREATE UNIQUE INDEX "idx_purchase_orders_org_code"
            ON "operational"."purchase_orders" ("organization_id", "code")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_purchase_orders_organization_id"
            ON "operational"."purchase_orders" ("organization_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_purchase_orders_supplier_id"
            ON "operational"."purchase_orders" ("supplier_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_purchase_orders_status"
            ON "operational"."purchase_orders" ("status")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_purchase_orders_pharmacy_id"
            ON "operational"."purchase_orders" ("pharmacy_id")
        `);

        // Create purchase_order_items table
        await queryRunner.query(`
            CREATE TABLE "operational"."purchase_order_items" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "purchase_order_id" uuid NOT NULL,
                "drug_id" uuid NOT NULL,
                "quantity" DECIMAL(15,2) NOT NULL,
                "unit_price" DECIMAL(15,2) NOT NULL,
                "amount" DECIMAL(15,2) NOT NULL,
                "received_quantity" DECIMAL(15,2) NOT NULL DEFAULT 0,
                "invoiced_quantity" DECIMAL(15,2) NOT NULL DEFAULT 0,
                "expected_delivery_date" DATE,
                "uom" VARCHAR(50) NOT NULL DEFAULT 'Unit',
                "conversion_factor" DECIMAL(10,4) NOT NULL DEFAULT 1,
                "stock_uom" VARCHAR(50) NOT NULL DEFAULT 'Unit',
                "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
                "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
                "description" TEXT,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_purchase_order_item_purchase_order" FOREIGN KEY ("purchase_order_id")
                    REFERENCES "operational"."purchase_orders"("id") ON DELETE CASCADE
            )
        `);

        // Create indexes for purchase_order_items
        await queryRunner.query(`
            CREATE INDEX "idx_purchase_order_items_purchase_order_id"
            ON "operational"."purchase_order_items" ("purchase_order_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_purchase_order_items_drug_id"
            ON "operational"."purchase_order_items" ("drug_id")
        `);

        // Add comments
        await queryRunner.query(`
            COMMENT ON TABLE "operational"."purchase_orders" IS 'Purchase orders following ERPNext workflow'
        `);

        await queryRunner.query(`
            COMMENT ON TABLE "operational"."purchase_order_items" IS 'Line items for purchase orders (ERPNext-inspired)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "operational"."purchase_orders"."code" IS 'PO number (e.g., PO-2025-001)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "operational"."purchase_orders"."doc_status" IS 'ERPNext docstatus: 0=Draft, 1=Submitted, 2=Cancelled'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "operational"."purchase_order_items"."uom" IS 'Unit of measurement for ordering (e.g., Box, Strip)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "operational"."purchase_order_items"."stock_uom" IS 'Base unit for inventory (usually Unit)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "operational"."purchase_order_items"."conversion_factor" IS 'How many stock UOM in one UOM (e.g., 10 tablets per strip)'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "operational"."purchase_order_items" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "operational"."purchase_orders" CASCADE`);
        await queryRunner.query(`DROP TYPE IF EXISTS "operational"."purchase_order_status"`);
    }

}
