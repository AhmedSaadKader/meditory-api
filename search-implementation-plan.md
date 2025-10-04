# Drug Search Implementation Plan

**Date**: 2025-10-02
**Goal**: Implement comprehensive drug search API with ingredient, dosage form, and route filtering

---

## 🎯 Search Capabilities to Implement

Based on database analysis, we can implement these search features:

### 1. **Ingredient Search** ⭐ Primary Feature
- Search by active ingredient name
- Support synonyms and alternative spellings
- Return ingredient groups
- Show therapeutic categories

**Function**: `find_drugs_hierarchical(search_term)`
- **Input**: Ingredient name (e.g., "paracetamol", "vitamin c")
- **Output**: drug_name, company, price, group_name, standard_term, match_type
- **Performance**: Fast (uses optimized `drug_ingredient_search_v2`)

### 2. **Dosage Form Filter** ✅ Ready (99.96% coverage)
- Filter by tablet, capsule, syrup, cream, etc.
- 53 standardized dosage forms
- Works with ingredient search

**Implementation**: Join on `dosage_forms` table via `dosage_form_id`

### 3. **Route Filter** ⚠️ Needs Fix First (39% → 97% after fix)
- Filter by oral, topical, IV, etc.
- 15 standardized routes
- Works with ingredient search

**Implementation**: Join on `routes` table via `route_id` (after fixing compound routes)

### 4. **Therapeutic Category Search** ⭐ Advanced Feature
- Search by therapeutic class (e.g., "analgesic", "antibiotic")
- Search by ATC code (e.g., "N02B")
- Search by medical indication (e.g., "pain", "hypertension")

**Functions**:
- `find_drugs_by_therapeutic_category(category_search)`
- `find_drugs_by_atc_code(atc_search)`
- `find_drugs_by_indication(indication_search)`

### 5. **Advanced Multi-Criteria Search** 🔥 Power Feature
- Combine multiple filters
- Ranked results by match score

**Function**: `find_drugs_advanced_search(p_therapeutic_category, p_atc_code, p_indication, p_mechanism, p_ingredient)`

---

## 🗂️ API Endpoint Design

### Base URL: `/api/drugs`

### 1. **Simple Search** (Current - Keep)
```
GET /api/drugs?search=paracetamol&page=1&limit=20
```
**Uses**: NestJS Paginate with `DRUG_PAGINATION_CONFIG`
**Searches**: name, description, company, barcode, active_raw, dosage_form

### 2. **Ingredient Search** (New - Primary)
```
GET /api/drugs/search/ingredient?query=paracetamol&page=1&limit=20
```
**Database Function**: `find_drugs_hierarchical()`
**Returns**:
```json
{
  "data": [
    {
      "drug_name": "Panadol 500mg",
      "company": "GSK",
      "price": 15.00,
      "group_name": "Paracetamol",
      "standard_term": "Paracetamol (Acetaminophen)",
      "match_type": "direct"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

### 3. **Ingredient Search with Filters** (New - Enhanced)
```
GET /api/drugs/search/ingredient?query=paracetamol&dosage_form=tablet&route=oral&page=1&limit=20
```
**Database Function**: Custom query combining `find_drugs_hierarchical()` with filters
**Filters**:
- `dosage_form`: tablet, capsule, syrup, cream, etc.
- `route`: oral, topical, iv, etc.
- `price_min`, `price_max`: numeric range

### 4. **Therapeutic Category Search** (New)
```
GET /api/drugs/search/therapeutic?category=analgesic&page=1&limit=20
```
**Database Function**: `find_drugs_by_therapeutic_category()`

### 5. **ATC Code Search** (New)
```
GET /api/drugs/search/atc?code=N02B&page=1&limit=20
```
**Database Function**: `find_drugs_by_atc_code()`

### 6. **Indication Search** (New)
```
GET /api/drugs/search/indication?query=pain&page=1&limit=20
```
**Database Function**: `find_drugs_by_indication()`

### 7. **Advanced Search** (New - Power Feature)
```
POST /api/drugs/search/advanced
Body:
{
  "ingredient": "paracetamol",
  "therapeutic_category": "analgesic",
  "indication": "pain",
  "dosage_form": "tablet",
  "route": "oral",
  "price_range": { "min": 10, "max": 50 }
}
```
**Database Function**: `find_drugs_advanced_search()` with additional filters

### 8. **Get Available Filters** (New - Helper)
```
GET /api/drugs/filters
```
**Returns**:
```json
{
  "dosage_forms": [
    { "id": 1, "name": "Tablet", "count": 12354 },
    { "id": 2, "name": "Capsule", "count": 4828 }
  ],
  "routes": [
    { "id": 1, "name": "Oral", "count": 21861 },
    { "id": 2, "name": "Topical", "count": 15418 }
  ],
  "therapeutic_categories": [
    { "id": 1, "name": "Analgesics - Non-Opioid", "atc_code": "N02B" }
  ]
}
```

---

## 🏗️ Implementation Steps

### Phase 1: Database Setup ⚠️ Critical

#### 1.1 Backup Remote Database ✅
```bash
pg_dump -h switchyard.proxy.rlwy.net -U postgres -p 18252 -d railway \
  -F c -f backups/meditory-db-backup-20251002.dump
```

#### 1.2 Set Up Local PostgreSQL
```bash
# Windows - Install PostgreSQL if not already installed
# Check if running
pg_isready

# Create local database
createdb meditory_local
```

#### 1.3 Restore Backup Locally
```bash
pg_restore -d meditory_local -F c backups/meditory-db-backup-20251002.dump
```

#### 1.4 Fix Route Linking Function ⚠️ CRITICAL
```sql
-- File: migrations/fix-route-linking.sql

CREATE OR REPLACE FUNCTION link_drugs_to_routes_enhanced()
RETURNS integer AS $$
DECLARE
    updated_count INTEGER := 0;
    pass1_count INTEGER := 0;
    pass2_count INTEGER := 0;
BEGIN
    -- Pass 1: Exact matches
    UPDATE drug_ingredient_search_v2 AS dis
    SET route_id = r.id
    FROM drugs d
    JOIN routes r ON TRIM(LOWER(d.route)) = LOWER(r.raw_name)
    WHERE dis.drug_id = d.drug_id
    AND r.is_standardized = TRUE
    AND dis.route_id IS NULL;

    GET DIAGNOSTICS pass1_count = ROW_COUNT;

    -- Pass 2: Compound routes (e.g., "oral.solid" -> "oral")
    UPDATE drug_ingredient_search_v2 AS dis
    SET route_id = r.id
    FROM drugs d
    JOIN routes r ON SPLIT_PART(TRIM(LOWER(d.route)), '.', 1) = LOWER(r.raw_name)
    WHERE dis.drug_id = d.drug_id
    AND r.is_standardized = TRUE
    AND dis.route_id IS NULL
    AND POSITION('.' IN d.route) > 0;

    GET DIAGNOSTICS pass2_count = ROW_COUNT;

    updated_count := pass1_count + pass2_count;

    RAISE NOTICE 'Pass 1 (exact): % rows', pass1_count;
    RAISE NOTICE 'Pass 2 (compound): % rows', pass2_count;
    RAISE NOTICE 'Total: % rows', updated_count;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Run the enhanced linking
SELECT link_drugs_to_routes_enhanced();

-- Verify
SELECT
    COUNT(DISTINCT drug_id) FILTER (WHERE route_id IS NOT NULL) as linked,
    COUNT(DISTINCT drug_id) as total,
    ROUND(100.0 * COUNT(DISTINCT drug_id) FILTER (WHERE route_id IS NOT NULL) /
          COUNT(DISTINCT drug_id), 2) as coverage_pct
FROM drug_ingredient_search_v2;
```

#### 1.5 Update .env for Local Database
```env
# .env.local
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_local_password
DATABASE_NAME=meditory_local
```

---

### Phase 2: NestJS Implementation

#### 2.1 Create Database Entities

**File**: `src/drugs/entities/dosage-form.entity.ts`
```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('dosage_forms')
export class DosageForm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  raw_name: string;

  @Column({ nullable: true })
  standard_name: string;

  @Column({ nullable: true })
  pharmaceutical_category: string;

  @Column('text', { array: true, nullable: true })
  synonyms: string[];

  @Column({ default: false })
  is_standardized: boolean;
}
```

**File**: `src/drugs/entities/route.entity.ts`
```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  raw_name: string;

  @Column({ nullable: true })
  standard_name: string;

  @Column({ nullable: true })
  administration_type: string;

  @Column('text', { array: true, nullable: true })
  synonyms: string[];

  @Column({ default: false })
  is_standardized: boolean;
}
```

#### 2.2 Create DTOs

**File**: `src/drugs/dto/search-ingredient.dto.ts`
```typescript
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchIngredientDto {
  @ApiProperty({ description: 'Ingredient name to search for', example: 'paracetamol' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Filter by dosage form', example: 'tablet' })
  @IsOptional()
  @IsString()
  dosage_form?: string;

  @ApiPropertyOptional({ description: 'Filter by route', example: 'oral' })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional({ description: 'Minimum price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_min?: number;

  @ApiPropertyOptional({ description: 'Maximum price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_max?: number;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

**File**: `src/drugs/dto/advanced-search.dto.ts`
```typescript
import { IsString, IsOptional, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class PriceRangeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  min?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  max?: number;
}

export class AdvancedSearchDto {
  @ApiPropertyOptional({ description: 'Ingredient name' })
  @IsOptional()
  @IsString()
  ingredient?: string;

  @ApiPropertyOptional({ description: 'Therapeutic category' })
  @IsOptional()
  @IsString()
  therapeutic_category?: string;

  @ApiPropertyOptional({ description: 'ATC code' })
  @IsOptional()
  @IsString()
  atc_code?: string;

  @ApiPropertyOptional({ description: 'Medical indication' })
  @IsOptional()
  @IsString()
  indication?: string;

  @ApiPropertyOptional({ description: 'Mechanism of action' })
  @IsOptional()
  @IsString()
  mechanism?: string;

  @ApiPropertyOptional({ description: 'Dosage form' })
  @IsOptional()
  @IsString()
  dosage_form?: string;

  @ApiPropertyOptional({ description: 'Route' })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional({ description: 'Price range', type: PriceRangeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  price_range?: PriceRangeDto;
}
```

#### 2.3 Update Drugs Service

**File**: `src/drugs/drugs.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Drug } from './entities/drug.entity';
import { DosageForm } from './entities/dosage-form.entity';
import { Route } from './entities/route.entity';
import { SearchIngredientDto } from './dto/search-ingredient.dto';
import { AdvancedSearchDto } from './dto/advanced-search.dto';

@Injectable()
export class DrugsService {
  constructor(
    @InjectRepository(Drug)
    private drugsRepository: Repository<Drug>,
    @InjectRepository(DosageForm)
    private dosageFormsRepository: Repository<DosageForm>,
    @InjectRepository(Route)
    private routesRepository: Repository<Route>,
  ) {}

  // Existing methods...

  /**
   * Search drugs by ingredient using optimized database function
   */
  async searchByIngredient(dto: SearchIngredientDto) {
    const { query, dosage_form, route, price_min, price_max, page = 1, limit = 20 } = dto;
    const offset = (page - 1) * limit;

    // Build the SQL query
    let sql = `
      SELECT
        dis.drug_name,
        dis.company,
        dis.price,
        dis.group_name,
        dis.standard_term,
        sr.match_type,
        df.standard_name as dosage_form,
        r.standard_name as route
      FROM find_drugs_hierarchical($1) sr
      JOIN drug_ingredient_search_v2 dis ON dis.drug_name = sr.drug_name
      LEFT JOIN dosage_forms df ON dis.dosage_form_id = df.id
      LEFT JOIN routes r ON dis.route_id = r.id
      WHERE 1=1
    `;

    const params: any[] = [query];
    let paramIndex = 2;

    // Add filters
    if (dosage_form) {
      sql += ` AND LOWER(df.standard_name) = LOWER($${paramIndex})`;
      params.push(dosage_form);
      paramIndex++;
    }

    if (route) {
      sql += ` AND LOWER(r.standard_name) = LOWER($${paramIndex})`;
      params.push(route);
      paramIndex++;
    }

    if (price_min !== undefined) {
      sql += ` AND dis.price >= $${paramIndex}`;
      params.push(price_min);
      paramIndex++;
    }

    if (price_max !== undefined) {
      sql += ` AND dis.price <= $${paramIndex}`;
      params.push(price_max);
      paramIndex++;
    }

    // Get total count
    const countSql = `SELECT COUNT(DISTINCT dis.drug_name) as total FROM (${sql}) as subquery`;
    const countResult = await this.drugsRepository.query(countSql, params);
    const total = parseInt(countResult[0]?.total || '0');

    // Add pagination
    sql += ` ORDER BY sr.match_type, dis.drug_name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const results = await this.drugsRepository.query(sql, params);

    return {
      data: results,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Search by therapeutic category
   */
  async searchByTherapeuticCategory(category: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const sql = `
      SELECT * FROM find_drugs_by_therapeutic_category($1)
      LIMIT $2 OFFSET $3
    `;

    const results = await this.drugsRepository.query(sql, [category, limit, offset]);

    // Get count
    const countSql = `SELECT COUNT(*) as total FROM find_drugs_by_therapeutic_category($1)`;
    const countResult = await this.drugsRepository.query(countSql, [category]);
    const total = parseInt(countResult[0]?.total || '0');

    return {
      data: results,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Search by ATC code
   */
  async searchByAtcCode(code: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const sql = `
      SELECT * FROM find_drugs_by_atc_code($1)
      LIMIT $2 OFFSET $3
    `;

    const results = await this.drugsRepository.query(sql, [code, limit, offset]);

    const countSql = `SELECT COUNT(*) as total FROM find_drugs_by_atc_code($1)`;
    const countResult = await this.drugsRepository.query(countSql, [code]);
    const total = parseInt(countResult[0]?.total || '0');

    return {
      data: results,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Search by medical indication
   */
  async searchByIndication(indication: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const sql = `
      SELECT * FROM find_drugs_by_indication($1)
      LIMIT $2 OFFSET $3
    `;

    const results = await this.drugsRepository.query(sql, [indication, limit, offset]);

    const countSql = `SELECT COUNT(*) as total FROM find_drugs_by_indication($1)`;
    const countResult = await this.drugsRepository.query(countSql, [indication]);
    const total = parseInt(countResult[0]?.total || '0');

    return {
      data: results,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Advanced multi-criteria search
   */
  async advancedSearch(dto: AdvancedSearchDto, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const sql = `
      SELECT * FROM find_drugs_advanced_search($1, $2, $3, $4, $5)
      ORDER BY match_score DESC
      LIMIT $6 OFFSET $7
    `;

    const results = await this.drugsRepository.query(sql, [
      dto.therapeutic_category || null,
      dto.atc_code || null,
      dto.indication || null,
      dto.mechanism || null,
      dto.ingredient || null,
      limit,
      offset,
    ]);

    // Filter by additional criteria
    let filteredResults = results;

    if (dto.price_range?.min !== undefined) {
      filteredResults = filteredResults.filter(r => r.price >= dto.price_range.min);
    }

    if (dto.price_range?.max !== undefined) {
      filteredResults = filteredResults.filter(r => r.price <= dto.price_range.max);
    }

    const total = filteredResults.length;

    return {
      data: filteredResults,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get available filters (dosage forms, routes, categories)
   */
  async getAvailableFilters() {
    // Get dosage forms with counts
    const dosageForms = await this.drugsRepository.query(`
      SELECT
        df.id,
        df.standard_name as name,
        df.pharmaceutical_category as category,
        COUNT(DISTINCT dis.drug_id) as count
      FROM dosage_forms df
      LEFT JOIN drug_ingredient_search_v2 dis ON df.id = dis.dosage_form_id
      WHERE df.is_standardized = true
      GROUP BY df.id, df.standard_name, df.pharmaceutical_category
      ORDER BY count DESC
    `);

    // Get routes with counts
    const routes = await this.drugsRepository.query(`
      SELECT
        r.id,
        r.standard_name as name,
        r.administration_type as type,
        COUNT(DISTINCT dis.drug_id) as count
      FROM routes r
      LEFT JOIN drug_ingredient_search_v2 dis ON r.id = dis.route_id
      WHERE r.is_standardized = true
      GROUP BY r.id, r.standard_name, r.administration_type
      ORDER BY count DESC
    `);

    // Get therapeutic categories
    const therapeuticCategories = await this.drugsRepository.query(`
      SELECT
        id,
        category_name as name,
        atc_code,
        mechanism_of_action,
        primary_indications
      FROM therapeutic_categories
      ORDER BY category_name
    `);

    return {
      dosage_forms: dosageForms,
      routes: routes,
      therapeutic_categories: therapeuticCategories,
    };
  }
}
```

#### 2.4 Update Drugs Controller

**File**: `src/drugs/drugs.controller.ts`
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DrugsService } from './drugs.service';
import { SearchIngredientDto } from './dto/search-ingredient.dto';
import { AdvancedSearchDto } from './dto/advanced-search.dto';

@ApiTags('drugs')
@Controller('drugs')
export class DrugsController {
  constructor(private readonly drugsService: DrugsService) {}

  // Existing endpoints...

  @Get('search/ingredient')
  @ApiOperation({ summary: 'Search drugs by ingredient with filters' })
  async searchByIngredient(@Query() dto: SearchIngredientDto) {
    return this.drugsService.searchByIngredient(dto);
  }

  @Get('search/therapeutic')
  @ApiOperation({ summary: 'Search drugs by therapeutic category' })
  @ApiQuery({ name: 'category', example: 'analgesic' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async searchByTherapeutic(
    @Query('category') category: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.drugsService.searchByTherapeuticCategory(category, page, limit);
  }

  @Get('search/atc')
  @ApiOperation({ summary: 'Search drugs by ATC code' })
  @ApiQuery({ name: 'code', example: 'N02B' })
  async searchByAtc(
    @Query('code') code: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.drugsService.searchByAtcCode(code, page, limit);
  }

  @Get('search/indication')
  @ApiOperation({ summary: 'Search drugs by medical indication' })
  @ApiQuery({ name: 'query', example: 'pain' })
  async searchByIndication(
    @Query('query') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.drugsService.searchByIndication(query, page, limit);
  }

  @Post('search/advanced')
  @ApiOperation({ summary: 'Advanced multi-criteria search' })
  async advancedSearch(
    @Body() dto: AdvancedSearchDto,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.drugsService.advancedSearch(dto, page, limit);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Get available filters (dosage forms, routes, categories)' })
  async getFilters() {
    return this.drugsService.getAvailableFilters();
  }
}
```

#### 2.5 Update Module

**File**: `src/drugs/drugs.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DrugsController } from './drugs.controller';
import { DrugsService } from './drugs.service';
import { Drug } from './entities/drug.entity';
import { DosageForm } from './entities/dosage-form.entity';
import { Route } from './entities/route.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Drug, DosageForm, Route]),
  ],
  controllers: [DrugsController],
  providers: [DrugsService],
  exports: [DrugsService],
})
export class DrugsModule {}
```

---

## 🧪 Testing Plan

### 1. Database Functions Test
```sql
-- Test ingredient search
SELECT * FROM find_drugs_hierarchical('paracetamol') LIMIT 5;

-- Test with dosage form filter
SELECT dis.*, df.standard_name
FROM find_drugs_hierarchical('paracetamol') fh
JOIN drug_ingredient_search_v2 dis ON fh.drug_name = dis.drug_name
JOIN dosage_forms df ON dis.dosage_form_id = df.id
WHERE df.standard_name = 'Tablet'
LIMIT 5;

-- Test therapeutic search
SELECT * FROM find_drugs_by_therapeutic_category('analgesic') LIMIT 5;

-- Test ATC search
SELECT * FROM find_drugs_by_atc_code('N02') LIMIT 5;
```

### 2. API Endpoints Test
```bash
# Test ingredient search
curl "http://localhost:3000/api/drugs/search/ingredient?query=paracetamol&page=1&limit=10"

# Test with filters
curl "http://localhost:3000/api/drugs/search/ingredient?query=paracetamol&dosage_form=tablet&route=oral"

# Test therapeutic search
curl "http://localhost:3000/api/drugs/search/therapeutic?category=analgesic"

# Test get filters
curl "http://localhost:3000/api/drugs/filters"

# Test advanced search
curl -X POST "http://localhost:3000/api/drugs/search/advanced" \
  -H "Content-Type: application/json" \
  -d '{
    "ingredient": "paracetamol",
    "therapeutic_category": "analgesic",
    "dosage_form": "tablet"
  }'
```

---

## 📊 Expected Performance

| Search Type | Database Function | Expected Speed | Coverage |
|-------------|------------------|----------------|----------|
| Ingredient | `find_drugs_hierarchical()` | <100ms | 100% of searchable drugs |
| + Dosage Form Filter | JOIN on `dosage_forms` | <150ms | 99.96% |
| + Route Filter | JOIN on `routes` | <150ms | 97% (after fix) |
| Therapeutic | `find_drugs_by_therapeutic_category()` | <200ms | Via ingredient groups |
| ATC Code | `find_drugs_by_atc_code()` | <200ms | Via therapeutic categories |
| Advanced | `find_drugs_advanced_search()` | <300ms | Combined criteria |

---

## 🚀 Deployment Checklist

### Local Development
- [ ] Backup remote database
- [ ] Set up local PostgreSQL
- [ ] Restore backup locally
- [ ] Run route linking fix
- [ ] Verify data integrity
- [ ] Update .env.local
- [ ] Test all database functions
- [ ] Implement API endpoints
- [ ] Test API endpoints
- [ ] Write integration tests

### Production
- [ ] Run route linking fix on remote database
- [ ] Verify route coverage (39% → 97%)
- [ ] Deploy API changes
- [ ] Update API documentation
- [ ] Monitor performance
- [ ] Set up error tracking

---

## 📝 Notes

- All search functions use the optimized `drug_ingredient_search_v2` table
- Route linking must be fixed before deploying route filters
- 3,906 drugs (16%) have no ingredients and won't appear in searches
- Consider adding caching for filter counts (they don't change often)
- Consider adding Elasticsearch for even faster full-text search (future)
