import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeUsernameUnique1761379423140 implements MigrationInterface {
    name = 'MakeUsernameUnique1761379423140'

    public async up(queryRunner: QueryRunner): Promise<void> {
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
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
    }

}
