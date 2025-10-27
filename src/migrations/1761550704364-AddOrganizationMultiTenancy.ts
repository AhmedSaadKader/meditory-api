import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrganizationMultiTenancy1761550704364 implements MigrationInterface {
    name = 'AddOrganizationMultiTenancy1761550704364'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "operational"."role_pharmacies" DROP CONSTRAINT "fk_role_pharmacies_pharmacy"`);
        await queryRunner.query(`ALTER TABLE "operational"."role_pharmacies" DROP CONSTRAINT "fk_role_pharmacies_role"`);
        await queryRunner.query(`DROP INDEX "reference"."idx_dosage_forms_category"`);
        await queryRunner.query(`DROP INDEX "reference"."idx_dosage_forms_raw_name"`);
        await queryRunner.query(`DROP INDEX "reference"."idx_dosage_forms_standard_name"`);
        await queryRunner.query(`DROP INDEX "reference"."idx_dosage_forms_standardized"`);
        await queryRunner.query(`DROP INDEX "reference"."idx_dosage_forms_synonyms"`);
        await queryRunner.query(`DROP INDEX "reference"."idx_routes_admin_type"`);
        await queryRunner.query(`DROP INDEX "reference"."idx_routes_raw_name"`);
        await queryRunner.query(`DROP INDEX "reference"."idx_routes_standard_name"`);
        await queryRunner.query(`DROP INDEX "reference"."idx_routes_standardized"`);
        await queryRunner.query(`DROP INDEX "reference"."idx_routes_synonyms"`);
        await queryRunner.query(`DROP INDEX "operational"."idx_stock_fefo_lookup"`);
        await queryRunner.query(`DROP INDEX "operational"."idx_stock_expiry_monitoring"`);
        await queryRunner.query(`DROP INDEX "operational"."idx_stock_low_level"`);
        await queryRunner.query(`DROP INDEX "operational"."idx_movement_pharmacy_date"`);
        await queryRunner.query(`DROP INDEX "operational"."idx_movement_drug_audit"`);
        await queryRunner.query(`DROP INDEX "operational"."idx_role_pharmacies_role"`);
        await queryRunner.query(`DROP INDEX "operational"."idx_role_pharmacies_pharmacy"`);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacy_stock" DROP CONSTRAINT "check_quantity_non_negative"`);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacy_stock" DROP CONSTRAINT "check_allocated_non_negative"`);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacy_stock" DROP CONSTRAINT "check_allocated_within_quantity"`);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacy_stock" DROP CONSTRAINT "check_cost_price_positive"`);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacy_stock" DROP CONSTRAINT "check_selling_price_positive"`);
        // Step 1: Create organizations table
        await queryRunner.query(`CREATE TABLE "operational"."organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(100) NOT NULL, "name" character varying(255) NOT NULL, "token" character varying(100) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "description" text, "settings" json, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7e27c3b62c681fbe3e2322535f2" UNIQUE ("code"), CONSTRAINT "UQ_31cc56939bd3dcc10e4bfb482ce" UNIQUE ("token"), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);

        // Step 2: Create default organization for existing data
        await queryRunner.query(`
            INSERT INTO "operational"."organizations" ("id", "code", "name", "token", "description")
            VALUES (
                'ffffffff-ffff-ffff-ffff-ffffffffffff',
                'default-org',
                'Default Organization',
                'default-token-' || md5(random()::text || clock_timestamp()::text),
                'Auto-created default organization for existing data migration'
            )
            ON CONFLICT DO NOTHING
        `);

        // Step 3: Add columns as nullable first
        await queryRunner.query(`ALTER TABLE "operational"."pharmacies" ADD "organization_id" uuid`);
        await queryRunner.query(`ALTER TABLE "operational"."roles" ADD "organization_id" uuid`);
        await queryRunner.query(`ALTER TABLE "operational"."users" ADD "organization_id" uuid`);

        // Step 4: Update existing records to use default organization
        await queryRunner.query(`UPDATE "operational"."pharmacies" SET "organization_id" = 'ffffffff-ffff-ffff-ffff-ffffffffffff' WHERE "organization_id" IS NULL`);
        await queryRunner.query(`UPDATE "operational"."roles" SET "organization_id" = 'ffffffff-ffff-ffff-ffff-ffffffffffff' WHERE "organization_id" IS NULL`);
        await queryRunner.query(`UPDATE "operational"."users" SET "organization_id" = 'ffffffff-ffff-ffff-ffff-ffffffffffff' WHERE "organization_id" IS NULL`);

        // Step 5: Make columns NOT NULL (except users.organization_id which can be null for platform admins)
        await queryRunner.query(`ALTER TABLE "operational"."pharmacies" ALTER COLUMN "organization_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "operational"."roles" ALTER COLUMN "organization_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reference"."dosage_forms" DROP CONSTRAINT "dosage_forms_raw_name_key"`);
        await queryRunner.query(`ALTER TABLE "reference"."dosage_forms" ALTER COLUMN "is_standardized" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reference"."dosage_forms" ALTER COLUMN "created_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reference"."dosage_forms" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "reference"."dosage_forms" ALTER COLUMN "updated_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reference"."dosage_forms" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "reference"."routes" DROP CONSTRAINT "routes_raw_name_key"`);
        await queryRunner.query(`ALTER TABLE "reference"."routes" ALTER COLUMN "is_standardized" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reference"."routes" ALTER COLUMN "created_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reference"."routes" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "reference"."routes" ALTER COLUMN "updated_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reference"."routes" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "IDX_688bf2f2553b3fec913a48a3dd" ON "operational"."pharmacies" ("organization_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c328a1ecd12a5f153a96df4509" ON "operational"."roles" ("organization_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_21a659804ed7bf61eb91688dea" ON "operational"."users" ("organization_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_bba284fc1317c147e97e197c2f" ON "operational"."role_pharmacies" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ca1a89f71bedb1044cb0d3caaf" ON "operational"."role_pharmacies" ("pharmacy_id") `);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacies" ADD CONSTRAINT "FK_688bf2f2553b3fec913a48a3dd4" FOREIGN KEY ("organization_id") REFERENCES "operational"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operational"."roles" ADD CONSTRAINT "FK_c328a1ecd12a5f153a96df4509e" FOREIGN KEY ("organization_id") REFERENCES "operational"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operational"."users" ADD CONSTRAINT "FK_21a659804ed7bf61eb91688dea7" FOREIGN KEY ("organization_id") REFERENCES "operational"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacy_stock" ADD CONSTRAINT "FK_744b5ba852835b0a77e685099c2" FOREIGN KEY ("drug_id") REFERENCES "reference"."drugs"("drug_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operational"."role_pharmacies" ADD CONSTRAINT "FK_bba284fc1317c147e97e197c2f3" FOREIGN KEY ("role_id") REFERENCES "operational"."roles"("role_id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "operational"."role_pharmacies" ADD CONSTRAINT "FK_ca1a89f71bedb1044cb0d3caafc" FOREIGN KEY ("pharmacy_id") REFERENCES "operational"."pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "operational"."role_pharmacies" DROP CONSTRAINT "FK_ca1a89f71bedb1044cb0d3caafc"`);
        await queryRunner.query(`ALTER TABLE "operational"."role_pharmacies" DROP CONSTRAINT "FK_bba284fc1317c147e97e197c2f3"`);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacy_stock" DROP CONSTRAINT "FK_744b5ba852835b0a77e685099c2"`);
        await queryRunner.query(`ALTER TABLE "operational"."users" DROP CONSTRAINT "FK_21a659804ed7bf61eb91688dea7"`);
        await queryRunner.query(`ALTER TABLE "operational"."roles" DROP CONSTRAINT "FK_c328a1ecd12a5f153a96df4509e"`);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacies" DROP CONSTRAINT "FK_688bf2f2553b3fec913a48a3dd4"`);
        await queryRunner.query(`DROP INDEX "operational"."IDX_ca1a89f71bedb1044cb0d3caaf"`);
        await queryRunner.query(`DROP INDEX "operational"."IDX_bba284fc1317c147e97e197c2f"`);
        await queryRunner.query(`DROP INDEX "operational"."IDX_21a659804ed7bf61eb91688dea"`);
        await queryRunner.query(`DROP INDEX "operational"."IDX_c328a1ecd12a5f153a96df4509"`);
        await queryRunner.query(`DROP INDEX "operational"."IDX_688bf2f2553b3fec913a48a3dd"`);
        await queryRunner.query(`ALTER TABLE "reference"."routes" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "reference"."routes" ALTER COLUMN "updated_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reference"."routes" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "reference"."routes" ALTER COLUMN "created_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reference"."routes" ALTER COLUMN "is_standardized" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reference"."routes" ADD CONSTRAINT "routes_raw_name_key" UNIQUE ("raw_name")`);
        await queryRunner.query(`ALTER TABLE "reference"."dosage_forms" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "reference"."dosage_forms" ALTER COLUMN "updated_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reference"."dosage_forms" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "reference"."dosage_forms" ALTER COLUMN "created_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reference"."dosage_forms" ALTER COLUMN "is_standardized" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reference"."dosage_forms" ADD CONSTRAINT "dosage_forms_raw_name_key" UNIQUE ("raw_name")`);
        // Drop organization_id columns (reverse order)
        await queryRunner.query(`ALTER TABLE "operational"."pharmacies" ALTER COLUMN "organization_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "operational"."roles" ALTER COLUMN "organization_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "operational"."users" DROP COLUMN "organization_id"`);
        await queryRunner.query(`ALTER TABLE "operational"."roles" DROP COLUMN "organization_id"`);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacies" DROP COLUMN "organization_id"`);
        await queryRunner.query(`DROP TABLE "operational"."organizations"`);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacy_stock" ADD CONSTRAINT "check_selling_price_positive" CHECK ((selling_price >= (0)::numeric))`);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacy_stock" ADD CONSTRAINT "check_cost_price_positive" CHECK ((cost_price >= (0)::numeric))`);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacy_stock" ADD CONSTRAINT "check_allocated_within_quantity" CHECK ((allocated_quantity <= quantity))`);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacy_stock" ADD CONSTRAINT "check_allocated_non_negative" CHECK ((allocated_quantity >= (0)::numeric))`);
        await queryRunner.query(`ALTER TABLE "operational"."pharmacy_stock" ADD CONSTRAINT "check_quantity_non_negative" CHECK ((quantity >= (0)::numeric))`);
        await queryRunner.query(`CREATE INDEX "idx_role_pharmacies_pharmacy" ON "operational"."role_pharmacies" ("pharmacy_id") `);
        await queryRunner.query(`CREATE INDEX "idx_role_pharmacies_role" ON "operational"."role_pharmacies" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "idx_movement_drug_audit" ON "operational"."stock_movements" ("created_at", "drug_id") `);
        await queryRunner.query(`CREATE INDEX "idx_movement_pharmacy_date" ON "operational"."stock_movements" ("created_at", "pharmacy_id") `);
        await queryRunner.query(`CREATE INDEX "idx_stock_low_level" ON "operational"."pharmacy_stock" ("minimum_stock_level", "pharmacy_id") WHERE (is_quarantined = false)`);
        await queryRunner.query(`CREATE INDEX "idx_stock_expiry_monitoring" ON "operational"."pharmacy_stock" ("expiry_date", "pharmacy_id") WHERE (quantity > (0)::numeric)`);
        await queryRunner.query(`CREATE INDEX "idx_stock_fefo_lookup" ON "operational"."pharmacy_stock" ("drug_id", "expiry_date", "pharmacy_id") WHERE ((quantity > (0)::numeric) AND (is_quarantined = false))`);
        await queryRunner.query(`CREATE INDEX "idx_routes_synonyms" ON "reference"."routes" ("synonyms") `);
        await queryRunner.query(`CREATE INDEX "idx_routes_standardized" ON "reference"."routes" ("is_standardized") `);
        await queryRunner.query(`CREATE INDEX "idx_routes_standard_name" ON "reference"."routes" ("standard_name") `);
        await queryRunner.query(`CREATE INDEX "idx_routes_raw_name" ON "reference"."routes" ("raw_name") `);
        await queryRunner.query(`CREATE INDEX "idx_routes_admin_type" ON "reference"."routes" ("administration_type") `);
        await queryRunner.query(`CREATE INDEX "idx_dosage_forms_synonyms" ON "reference"."dosage_forms" ("synonyms") `);
        await queryRunner.query(`CREATE INDEX "idx_dosage_forms_standardized" ON "reference"."dosage_forms" ("is_standardized") `);
        await queryRunner.query(`CREATE INDEX "idx_dosage_forms_standard_name" ON "reference"."dosage_forms" ("standard_name") `);
        await queryRunner.query(`CREATE INDEX "idx_dosage_forms_raw_name" ON "reference"."dosage_forms" ("raw_name") `);
        await queryRunner.query(`CREATE INDEX "idx_dosage_forms_category" ON "reference"."dosage_forms" ("pharmaceutical_category") `);
        await queryRunner.query(`ALTER TABLE "operational"."role_pharmacies" ADD CONSTRAINT "fk_role_pharmacies_role" FOREIGN KEY ("role_id") REFERENCES "operational"."roles"("role_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "operational"."role_pharmacies" ADD CONSTRAINT "fk_role_pharmacies_pharmacy" FOREIGN KEY ("pharmacy_id") REFERENCES "operational"."pharmacies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
