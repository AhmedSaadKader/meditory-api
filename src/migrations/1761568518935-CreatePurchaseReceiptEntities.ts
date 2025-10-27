import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePurchaseReceiptEntities1761568518935 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create purchase_receipt_status enum
        await queryRunner.query(`
            CREATE TYPE "operational"."purchase_receipt_status" AS ENUM (
                'DRAFT',
                'SUBMITTED',
                'COMPLETED',
                'CANCELLED'
            )
        `);

        // Create purchase_receipts table
        await queryRunner.query(`
            CREATE TABLE "operational"."purchase_receipts" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "organization_id" uuid NOT NULL,
                "code" VARCHAR(100) NOT NULL,
                "supplier_id" uuid NOT NULL,
                "purchase_order_id" uuid,
                "status" "operational"."purchase_receipt_status" NOT NULL DEFAULT 'DRAFT',
                "posting_date" DATE NOT NULL,
                "pharmacy_id" uuid NOT NULL,
                "total_quantity" DECIMAL(15,2) NOT NULL DEFAULT 0,
                "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
                "total_tax" DECIMAL(15,2) NOT NULL DEFAULT 0,
                "grand_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
                "invoiced_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
                "notes" TEXT,
                "supplier_delivery_note" VARCHAR(255),
                "lr_no" VARCHAR(100),
                "lr_date" DATE,
                "submitted_by" VARCHAR(255),
                "doc_status" INTEGER NOT NULL DEFAULT 0,
                "stock_posted" BOOLEAN NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "submitted_at" TIMESTAMP,
                "cancelled_at" TIMESTAMP,
                CONSTRAINT "fk_purchase_receipt_organization" FOREIGN KEY ("organization_id")
                    REFERENCES "operational"."organizations"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_purchase_receipt_supplier" FOREIGN KEY ("supplier_id")
                    REFERENCES "operational"."suppliers"("id") ON DELETE RESTRICT,
                CONSTRAINT "fk_purchase_receipt_purchase_order" FOREIGN KEY ("purchase_order_id")
                    REFERENCES "operational"."purchase_orders"("id") ON DELETE SET NULL
            )
        `);

        // Create indexes for purchase_receipts
        await queryRunner.query(`
            CREATE UNIQUE INDEX "idx_purchase_receipts_org_code"
            ON "operational"."purchase_receipts" ("organization_id", "code")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_purchase_receipts_organization_id"
            ON "operational"."purchase_receipts" ("organization_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_purchase_receipts_supplier_id"
            ON "operational"."purchase_receipts" ("supplier_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_purchase_receipts_purchase_order_id"
            ON "operational"."purchase_receipts" ("purchase_order_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_purchase_receipts_status"
            ON "operational"."purchase_receipts" ("status")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_purchase_receipts_pharmacy_id"
            ON "operational"."purchase_receipts" ("pharmacy_id")
        `);

        // Create purchase_receipt_items table
        await queryRunner.query(`
            CREATE TABLE "operational"."purchase_receipt_items" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "purchase_receipt_id" uuid NOT NULL,
                "purchase_order_item_id" uuid,
                "drug_id" uuid NOT NULL,
                "quantity" DECIMAL(15,2) NOT NULL,
                "unit_price" DECIMAL(15,2) NOT NULL,
                "amount" DECIMAL(15,2) NOT NULL,
                "batch_number" VARCHAR(100) NOT NULL,
                "expiry_date" DATE NOT NULL,
                "uom" VARCHAR(50) NOT NULL DEFAULT 'Unit',
                "conversion_factor" DECIMAL(10,4) NOT NULL DEFAULT 1,
                "stock_uom" VARCHAR(50) NOT NULL DEFAULT 'Unit',
                "stock_quantity" DECIMAL(15,2) NOT NULL,
                "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
                "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
                "invoiced_quantity" DECIMAL(15,2) NOT NULL DEFAULT 0,
                "description" TEXT,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_purchase_receipt_item_purchase_receipt" FOREIGN KEY ("purchase_receipt_id")
                    REFERENCES "operational"."purchase_receipts"("id") ON DELETE CASCADE
            )
        `);

        // Create indexes for purchase_receipt_items
        await queryRunner.query(`
            CREATE INDEX "idx_purchase_receipt_items_purchase_receipt_id"
            ON "operational"."purchase_receipt_items" ("purchase_receipt_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_purchase_receipt_items_drug_id"
            ON "operational"."purchase_receipt_items" ("drug_id")
        `);

        // Add comments
        await queryRunner.query(`
            COMMENT ON TABLE "operational"."purchase_receipts" IS 'Goods received notes following ERPNext workflow'
        `);

        await queryRunner.query(`
            COMMENT ON TABLE "operational"."purchase_receipt_items" IS 'Line items for purchase receipts with batch tracking'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "operational"."purchase_receipts"."code" IS 'Receipt number (e.g., PR-2025-001)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "operational"."purchase_receipts"."doc_status" IS 'ERPNext docstatus: 0=Draft, 1=Submitted, 2=Cancelled'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "operational"."purchase_receipts"."stock_posted" IS 'Whether stock movements have been created (idempotency flag)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "operational"."purchase_receipt_items"."stock_quantity" IS 'Quantity in base UOM (qty * conversion_factor)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "operational"."purchase_receipt_items"."batch_number" IS 'Supplier batch number for traceability'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "operational"."purchase_receipt_items"."expiry_date" IS 'Product expiry date (critical for pharmacy compliance)'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "operational"."purchase_receipt_items" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "operational"."purchase_receipts" CASCADE`);
        await queryRunner.query(`DROP TYPE IF EXISTS "operational"."purchase_receipt_status"`);
    }

}
