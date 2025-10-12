import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ReferenceDataService {
  constructor(private readonly dataSource: DataSource) {}

  async getIngredients() {
    const query = `
      SELECT DISTINCT
        ig.group_id as id,
        ig.group_name as name,
        ig.group_description as description,
        tc.category_name as therapeutic_category
      FROM reference.ingredient_groups ig
      LEFT JOIN reference.therapeutic_categories tc ON ig.therapeutic_category_id = tc.id
      WHERE ig.is_active = true
      ORDER BY ig.group_name
    `;

    const results = await this.dataSource.query<
      {
        id: number;
        name: string;
        description: string;
        therapeutic_category: string;
      }[]
    >(query);

    return { data: results, total: results.length };
  }

  async getDosageForms() {
    const query = `
      SELECT
        id,
        standard_name as name,
        raw_name,
        description,
        pharmaceutical_category,
        synonyms
      FROM reference.dosage_forms
      WHERE is_standardized = true
      ORDER BY standard_name
    `;

    const results = await this.dataSource.query<
      {
        id: number;
        name: string;
        raw_name: string;
        description: string;
        pharmaceutical_category: string;
        synonyms: string[];
      }[]
    >(query);

    return { data: results, total: results.length };
  }

  async getRoutes() {
    const query = `
      SELECT
        id,
        standard_name as name,
        raw_name,
        description,
        administration_type,
        synonyms
      FROM reference.routes
      WHERE is_standardized = true
      ORDER BY standard_name
    `;

    const results = await this.dataSource.query<
      {
        id: number;
        name: string;
        raw_name: string;
        description: string;
        administration_type: string;
        synonyms: string[];
      }[]
    >(query);

    return { data: results, total: results.length };
  }

  async getTherapeuticCategories() {
    const query = `
      SELECT
        id,
        category_name as name,
        category_description as description,
        atc_code,
        atc_level_1,
        atc_level_2,
        atc_level_3,
        atc_level_4,
        mechanism_of_action,
        primary_indications,
        contraindications,
        common_side_effects
      FROM reference.therapeutic_categories
      ORDER BY category_name
    `;

    const results = await this.dataSource.query<
      {
        id: number;
        name: string;
        description: string;
        atc_code: string;
        atc_level_1: string;
        atc_level_2: string;
        atc_level_3: string;
        atc_level_4: string;
        mechanism_of_action: string;
        primary_indications: string[];
        contraindications: string[];
        common_side_effects: string[];
      }[]
    >(query);

    return { data: results, total: results.length };
  }

  async getCompanies() {
    const query = `
      SELECT DISTINCT
        company as name
      FROM reference.drugs
      WHERE company IS NOT NULL
      ORDER BY company
    `;

    const results = await this.dataSource.query<{ name: string }[]>(query);

    return { data: results, total: results.length };
  }
}
