import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRolePharmacies1761482000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create role_pharmacies junction table
    await queryRunner.query(`
      CREATE TABLE operational.role_pharmacies (
        role_id INTEGER NOT NULL,
        pharmacy_id UUID NOT NULL,
        PRIMARY KEY (role_id, pharmacy_id),
        CONSTRAINT fk_role_pharmacies_role
          FOREIGN KEY (role_id)
          REFERENCES operational.roles(role_id)
          ON DELETE CASCADE,
        CONSTRAINT fk_role_pharmacies_pharmacy
          FOREIGN KEY (pharmacy_id)
          REFERENCES operational.pharmacies(id)
          ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX idx_role_pharmacies_role
      ON operational.role_pharmacies(role_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_role_pharmacies_pharmacy
      ON operational.role_pharmacies(pharmacy_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS operational.idx_role_pharmacies_pharmacy
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS operational.idx_role_pharmacies_role
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS operational.role_pharmacies
    `);
  }
}
