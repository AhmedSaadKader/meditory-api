import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveTherapeuticCategoriesToReference1760275113202
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists in public schema
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'therapeutic_categories'
      );
    `);

    if (tableExists[0].exists) {
      // Move therapeutic_categories table to reference schema
      await queryRunner.query(
        `ALTER TABLE public.therapeutic_categories SET SCHEMA reference`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Move table back to public schema
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'reference'
        AND table_name = 'therapeutic_categories'
      );
    `);

    if (tableExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE reference.therapeutic_categories SET SCHEMA public`,
      );
    }
  }
}
