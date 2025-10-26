import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePharmacyTable1761458931125 implements MigrationInterface {
  name = 'CreatePharmacyTable1761458931125';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "operational"."pharmacies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "code" character varying NOT NULL, "address" text, "licenseNumber" character varying, "isActive" boolean NOT NULL DEFAULT true, "isMainWarehouse" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4222c97244a75e4a1d7204058d4" UNIQUE ("code"), CONSTRAINT "PK_887410330080d3beb73850ebc8f" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "operational"."pharmacies"`);
  }
}
