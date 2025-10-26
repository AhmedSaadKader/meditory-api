import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStockTables1761460238984 implements MigrationInterface {
    name = 'CreateStockTables1761460238984'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "operational"."pharmacy_stock" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "pharmacy_id" uuid NOT NULL, "drug_id" integer NOT NULL, "batch_number" character varying NOT NULL, "quantity" numeric(10,2) NOT NULL DEFAULT '0', "allocated_quantity" numeric(10,2) NOT NULL DEFAULT '0', "minimum_stock_level" numeric(10,2) NOT NULL DEFAULT '0', "expiry_date" date, "cost_price" numeric(10,2), "selling_price" numeric(10,2), "supplier_name" character varying, "supplier_invoice_number" character varying, "received_date" date, "is_quarantined" boolean NOT NULL DEFAULT false, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a97eeaefffb98ab17ab778c1059" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_54011a7bf151da56f602d61bf8" ON "operational"."pharmacy_stock" ("pharmacy_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_744b5ba852835b0a77e685099c" ON "operational"."pharmacy_stock" ("drug_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_57ee0685a6b577e5927ae77302" ON "operational"."pharmacy_stock" ("pharmacy_id", "drug_id", "batch_number") `);
        await queryRunner.query(`CREATE TYPE "operational"."stock_movements_type_enum" AS ENUM('PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN_FROM_CUSTOMER', 'RETURN_TO_SUPPLIER', 'EXPIRY', 'DAMAGE', 'RECALL', 'TRANSFER_OUT', 'TRANSFER_IN', 'ALLOCATION', 'RELEASE', 'STOCK_TAKE')`);
        await queryRunner.query(`CREATE TABLE "operational"."stock_movements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "operational"."stock_movements_type_enum" NOT NULL, "pharmacy_id" uuid NOT NULL, "drug_id" integer NOT NULL, "batch_number" character varying NOT NULL, "quantity" numeric(10,2) NOT NULL, "balance_after" numeric(10,2) NOT NULL, "reference_type" character varying, "reference_id" character varying, "reference_number" character varying, "notes" text, "user_id" integer, "metadata" jsonb, "related_pharmacy_id" character varying, "related_movement_id" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_57a26b190618550d8e65fb860e7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d8d429564663e3f35551bbe8c1" ON "operational"."stock_movements" ("type", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_31a676ac26398aa0ffe0fa3b75" ON "operational"."stock_movements" ("batch_number", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_0014990611d645099db64c12ff" ON "operational"."stock_movements" ("pharmacy_id", "drug_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacy_stock" ADD CONSTRAINT "FK_54011a7bf151da56f602d61bf80" FOREIGN KEY ("pharmacy_id") REFERENCES "operational"."pharmacies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operational"."stock_movements" ADD CONSTRAINT "FK_6b0d670088b187e0c750a28b0d0" FOREIGN KEY ("pharmacy_id") REFERENCES "operational"."pharmacies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "operational"."stock_movements" DROP CONSTRAINT "FK_6b0d670088b187e0c750a28b0d0"`);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacy_stock" DROP CONSTRAINT "FK_54011a7bf151da56f602d61bf80"`);
        await queryRunner.query(`DROP INDEX "operational"."IDX_0014990611d645099db64c12ff"`);
        await queryRunner.query(`DROP INDEX "operational"."IDX_31a676ac26398aa0ffe0fa3b75"`);
        await queryRunner.query(`DROP INDEX "operational"."IDX_d8d429564663e3f35551bbe8c1"`);
        await queryRunner.query(`DROP TABLE "operational"."stock_movements"`);
        await queryRunner.query(`DROP TYPE "operational"."stock_movements_type_enum"`);
        await queryRunner.query(`DROP INDEX "operational"."IDX_57ee0685a6b577e5927ae77302"`);
        await queryRunner.query(`DROP INDEX "operational"."IDX_744b5ba852835b0a77e685099c"`);
        await queryRunner.query(`DROP INDEX "operational"."IDX_54011a7bf151da56f602d61bf8"`);
        await queryRunner.query(`DROP TABLE "operational"."pharmacy_stock"`);
    }

}
