import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveExistingTablesToReference1734000000001
  implements MigrationInterface
{
  name = 'MoveExistingTablesToReference1734000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Move existing drug-related tables from public to reference schema
    // These are read-heavy master data tables

    // Check and move drugs table
    const drugsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'drugs'
      );
    `);

    if (drugsExists[0].exists) {
      await queryRunner.query(`ALTER TABLE public.drugs SET SCHEMA reference`);
    }

    // Check and move dosage_forms table if it exists
    const dosageFormsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'dosage_forms'
      );
    `);

    if (dosageFormsExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE public.dosage_forms SET SCHEMA reference`,
      );
    }

    // Check and move routes table if it exists
    const routesExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'routes'
      );
    `);

    if (routesExists[0].exists) {
      await queryRunner.query(`ALTER TABLE public.routes SET SCHEMA reference`);
    }

    // If you have other reference tables from the pharm_db, move them too
    // For example: active_combinations, single_actives, ingredient_standards, etc.

    const activeCombinationsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'active_combinations'
      );
    `);

    if (activeCombinationsExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE public.active_combinations SET SCHEMA reference`,
      );
    }

    const singleActivesExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'single_actives'
      );
    `);

    if (singleActivesExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE public.single_actives SET SCHEMA reference`,
      );
    }

    const ingredientStandardsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'ingredient_standards'
      );
    `);

    if (ingredientStandardsExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE public.ingredient_standards SET SCHEMA reference`,
      );
    }

    const ingredientGroupsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'ingredient_groups'
      );
    `);

    if (ingredientGroupsExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE public.ingredient_groups SET SCHEMA reference`,
      );
    }

    const ingredientSynonymsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'ingredient_synonyms'
      );
    `);

    if (ingredientSynonymsExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE public.ingredient_synonyms SET SCHEMA reference`,
      );
    }

    const drugIngredientSearchExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'drug_ingredient_search_v2'
      );
    `);

    if (drugIngredientSearchExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE public.drug_ingredient_search_v2 SET SCHEMA reference`,
      );
    }

    const drugClassificationsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'drug_classifications'
      );
    `);

    if (drugClassificationsExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE public.drug_classifications SET SCHEMA reference`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Move tables back to public schema
    const drugsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'reference'
        AND table_name = 'drugs'
      );
    `);

    if (drugsExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE reference.drugs SET SCHEMA public`,
      );
    }

    const dosageFormsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'reference'
        AND table_name = 'dosage_forms'
      );
    `);

    if (dosageFormsExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE reference.dosage_forms SET SCHEMA public`,
      );
    }

    const routesExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'reference'
        AND table_name = 'routes'
      );
    `);

    if (routesExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE reference.routes SET SCHEMA public`,
      );
    }

    // Move other tables back
    const tables = [
      'active_combinations',
      'single_actives',
      'ingredient_standards',
      'ingredient_groups',
      'ingredient_synonyms',
      'drug_ingredient_search_v2',
      'drug_classifications',
    ];

    for (const table of tables) {
      const exists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'reference'
          AND table_name = '${table}'
        );
      `);

      if (exists[0].exists) {
        await queryRunner.query(
          `ALTER TABLE reference.${table} SET SCHEMA public`,
        );
      }
    }
  }
}
