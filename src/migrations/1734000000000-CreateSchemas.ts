import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchemas1734000000000 implements MigrationInterface {
  name = 'CreateSchemas1734000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create reference schema for master data (drugs, ingredients, clinical data)
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS reference`);

    // Create operational schema for transactional data (users, patients, prescriptions, etc.)
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS operational`);

    // Grant usage permissions
    await queryRunner.query(
      `GRANT USAGE ON SCHEMA reference TO ${process.env.DB_USERNAME}`,
    );
    await queryRunner.query(
      `GRANT USAGE ON SCHEMA operational TO ${process.env.DB_USERNAME}`,
    );

    // Grant permissions on all tables in schemas
    await queryRunner.query(
      `GRANT ALL ON ALL TABLES IN SCHEMA reference TO ${process.env.DB_USERNAME}`,
    );
    await queryRunner.query(
      `GRANT ALL ON ALL TABLES IN SCHEMA operational TO ${process.env.DB_USERNAME}`,
    );

    // Grant permissions on all sequences in schemas
    await queryRunner.query(
      `GRANT ALL ON ALL SEQUENCES IN SCHEMA reference TO ${process.env.DB_USERNAME}`,
    );
    await queryRunner.query(
      `GRANT ALL ON ALL SEQUENCES IN SCHEMA operational TO ${process.env.DB_USERNAME}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop schemas (CASCADE will drop all tables in them)
    await queryRunner.query(`DROP SCHEMA IF EXISTS operational CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS reference CASCADE`);
  }
}
