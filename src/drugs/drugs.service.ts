import { Injectable } from '@nestjs/common';
import { CreateDrugDto } from './dto/create-drug.dto';
import { UpdateDrugDto } from './dto/update-drug.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Drug } from './entities/drug.entity';
import { Repository } from 'typeorm';
import { paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { DRUG_PAGINATION_CONFIG } from './config/pagination.config';
import { sanitizeSearchTerm } from './utils/search.utils';

@Injectable()
export class DrugsService {
  constructor(
    @InjectRepository(Drug)
    private drugsRepository: Repository<Drug>,
  ) {}
  create(createDrugDto: CreateDrugDto) {
    const drug = this.drugsRepository.create(createDrugDto);
    return this.drugsRepository.save(drug);
  }

  findAll(query: PaginateQuery): Promise<Paginated<Drug>> {
    return paginate(query, this.drugsRepository, DRUG_PAGINATION_CONFIG);
  }

  findOne(id: number) {
    return this.drugsRepository.findOne({ where: { drug_id: id } });
  }

  update(id: number, updateDrugDto: UpdateDrugDto) {
    return this.drugsRepository.update(id, updateDrugDto);
  }

  remove(id: number) {
    return this.drugsRepository.delete(id);
  }

  /**
   * Search drugs by ingredient name using optimized database function
   * Uses find_drugs_hierarchical() which searches by:
   * - Standard ingredient terms (exact match)
   * - Synonyms (alternative names)
   * - Ingredient groups (finds all drugs in the group)
   *
   * @param ingredientName - Ingredient to search (e.g., 'paracetamol', 'vitamin c')
   * @param dosageForm - Optional: filter by dosage form (e.g., 'Tablet')
   * @param route - Optional: filter by route (e.g., 'Oral')
   * @param priceMin - Optional: minimum price
   * @param priceMax - Optional: maximum price
   * @param page - Page number (default 1)
   * @param limit - Items per page (default 20, max 100)
   */
  async searchByIngredient(
    ingredientName: string,
    dosageForm?: string,
    route?: string,
    priceMin?: number,
    priceMax?: number,
    page: number = 1,
    limit: number = 20,
  ) {
    // Validate and cap limit
    limit = Math.min(limit, 100);
    const offset = (page - 1) * limit;

    // Build SQL query using database function
    let sql = `
      SELECT DISTINCT
        dis.drug_name,
        dis.company,
        dis.price,
        dis.group_name,
        dis.standard_term,
        sr.match_type,
        df.standard_name as dosage_form,
        r.standard_name as route
      FROM find_drugs_hierarchical($1) sr
      JOIN drug_ingredient_search_v2 dis
        ON dis.drug_name = sr.drug_name
        AND dis.standard_term = sr.standard_term
      LEFT JOIN dosage_forms df ON dis.dosage_form_id = df.id
      LEFT JOIN routes r ON dis.route_id = r.id
      WHERE 1=1
    `;

    const params: (string | number)[] = [ingredientName];
    let paramIndex = 2;

    // Add filters
    if (dosageForm) {
      sql += ` AND LOWER(df.standard_name) = LOWER($${paramIndex})`;
      params.push(dosageForm);
      paramIndex++;
    }

    if (route) {
      sql += ` AND LOWER(r.standard_name) = LOWER($${paramIndex})`;
      params.push(route);
      paramIndex++;
    }

    if (priceMin !== undefined) {
      sql += ` AND dis.price >= $${paramIndex}`;
      params.push(priceMin);
      paramIndex++;
    }

    if (priceMax !== undefined) {
      sql += ` AND dis.price <= $${paramIndex}`;
      params.push(priceMax);
      paramIndex++;
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as subquery`;
    const countResult = await this.drugsRepository.query<{ total: string }[]>(
      countSql,
      params,
    );
    const total = parseInt(countResult[0]?.total || '0');

    // Add sorting and pagination
    sql += ` ORDER BY sr.match_type, dis.drug_name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const data = await this.drugsRepository.query<unknown[]>(sql, params);

    // Return in nestjs-paginate compatible format
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Unified search across drug names, ingredients, synonyms, and groups
   * Supports user-friendly wildcards: * (any chars) and ? (single char)
   *
   * @param searchTerm - Search query (supports * and ? wildcards)
   * @param dosageForm - Optional: filter by dosage form
   * @param route - Optional: filter by route
   * @param priceMin - Optional: minimum price
   * @param priceMax - Optional: maximum price
   * @param page - Page number (default 1)
   * @param limit - Items per page (default 20, max 100)
   */
  async searchUnified(
    searchTerm: string,
    dosageForm?: string,
    route?: string,
    priceMin?: number,
    priceMax?: number,
    page: number = 1,
    limit: number = 20,
  ) {
    // Validate and cap limit
    limit = Math.min(limit, 100);
    const offset = (page - 1) * limit;

    // Sanitize search term: translate user wildcards (* and ?) to SQL wildcards
    const sanitizedTerm = sanitizeSearchTerm(searchTerm);

    // Build SQL query using unified search function
    let sql = `
      SELECT DISTINCT
        dis.drug_name,
        dis.company,
        dis.price,
        dis.group_name,
        dis.standard_term,
        sr.match_type,
        df.standard_name as dosage_form,
        r.standard_name as route
      FROM find_drugs_unified($1) sr
      JOIN drug_ingredient_search_v2 dis
        ON dis.drug_name = sr.drug_name
        AND dis.standard_term = sr.standard_term
      LEFT JOIN dosage_forms df ON dis.dosage_form_id = df.id
      LEFT JOIN routes r ON dis.route_id = r.id
      WHERE 1=1
    `;

    const params: (string | number)[] = [sanitizedTerm];
    let paramIndex = 2;

    // Add filters
    if (dosageForm) {
      sql += ` AND LOWER(df.standard_name) = LOWER($${paramIndex})`;
      params.push(dosageForm);
      paramIndex++;
    }

    if (route) {
      sql += ` AND LOWER(r.standard_name) = LOWER($${paramIndex})`;
      params.push(route);
      paramIndex++;
    }

    if (priceMin !== undefined) {
      sql += ` AND dis.price >= $${paramIndex}`;
      params.push(priceMin);
      paramIndex++;
    }

    if (priceMax !== undefined) {
      sql += ` AND dis.price <= $${paramIndex}`;
      params.push(priceMax);
      paramIndex++;
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as subquery`;
    const countResult = await this.drugsRepository.query<{ total: string }[]>(
      countSql,
      params,
    );
    const total = parseInt(countResult[0]?.total || '0');

    // Add sorting and pagination
    sql += ` ORDER BY sr.match_type, dis.drug_name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const data = await this.drugsRepository.query<unknown[]>(sql, params);

    // Return in nestjs-paginate compatible format
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
