# Ingredient Standardization API Strategy

## Problem

Currently, the `/drugs` endpoint returns:
```json
{
  "drug_id": 2,
  "name": "1 2 3 syrup",
  "active_raw": "pseudoephedrine+paracetamol+chlorpheniramine"  ← Raw, unstandardized
}
```

But you have a sophisticated ingredient standardization system with:
- **ingredient_standards**: 5,118 standardized terms
- **ingredient_groups**: Consolidated groups (e.g., all Vitamin C variants)
- **ingredient_synonyms**: 6,939 alternative names
- **drug_ingredient_search_v2**: Denormalized, optimized search table (46,890 records)

## Solution: Three API Approaches

### Approach 1: Enrich Main Endpoint (Best for Client Experience)

**Endpoint:** `GET /drugs` and `GET /drugs/:id`

**Return standardized ingredients directly:**

```json
{
  "drug_id": 2,
  "name": "1 2 3 (one two three) syrup 120 ml",
  "price": "32.00",
  "company": "hikma",
  "active_raw": "pseudoephedrine+paracetamol+chlorpheniramine",  // Keep for backward compat
  "ingredients": [
    {
      "standard_id": 156,
      "standard_term": "Paracetamol",
      "group_id": 23,
      "group_name": "Analgesics - Non-opioid",
      "raw_text": "paracetamol",
      "synonyms": ["Acetaminophen", "Tylenol", "Panadol"]
    },
    {
      "standard_id": 892,
      "standard_term": "Pseudoephedrine",
      "group_id": 45,
      "group_name": "Decongestants",
      "raw_text": "pseudoephedrine",
      "synonyms": ["Pseudoephedrine HCl", "Sudafed"]
    },
    {
      "standard_id": 301,
      "standard_term": "Chlorpheniramine",
      "group_id": 12,
      "group_name": "Antihistamines - First Generation",
      "raw_text": "chlorpheniramine",
      "synonyms": ["Chlorpheniramine Maleate", "CPM"]
    }
  ]
}
```

**Pros:**
- ✅ Clients get full ingredient data in one request
- ✅ No additional endpoint calls needed
- ✅ Best user experience (instant ingredient details)

**Cons:**
- ⚠️ Slightly larger response size
- ⚠️ Extra DB query per drug

**Implementation:**

```typescript
// drugs.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Drug } from './entities/drug.entity';
import { Repository, DataSource } from 'typeorm';

@Injectable()
export class DrugsService {
  constructor(
    @InjectRepository(Drug)
    private drugsRepository: Repository<Drug>,
    private dataSource: DataSource,
  ) {}

  async findAll(query: PaginateQuery): Promise<Paginated<any>> {
    const result = await paginate(query, this.drugsRepository, DRUG_PAGINATION_CONFIG);

    // Enrich with standardized ingredients
    const enrichedData = await Promise.all(
      result.data.map(async (drug) => ({
        ...drug,
        ingredients: await this.getStandardizedIngredients(drug.drug_id),
      })),
    );

    return { ...result, data: enrichedData };
  }

  async findOne(id: number) {
    const drug = await this.drugsRepository.findOne({ where: { drug_id: id } });
    if (!drug) return null;

    return {
      ...drug,
      ingredients: await this.getStandardizedIngredients(id),
    };
  }

  /**
   * Get standardized ingredients using drug_ingredient_search_v2 table
   */
  private async getStandardizedIngredients(drugId: number) {
    const query = `
      SELECT DISTINCT
        dis.standard_id,
        dis.standard_term,
        dis.group_id,
        dis.group_name,
        sa.raw_ingredient_text,
        ARRAY_AGG(DISTINCT isyn.synonym_text) FILTER (WHERE isyn.synonym_text IS NOT NULL) as synonyms
      FROM reference.drug_ingredient_search_v2 dis
      LEFT JOIN reference.single_actives sa
        ON dis.single_active_id = sa.single_active_id
      LEFT JOIN reference.ingredient_synonyms isyn
        ON dis.standard_id = isyn.standard_id
      WHERE dis.drug_id = $1
      GROUP BY
        dis.standard_id,
        dis.standard_term,
        dis.group_id,
        dis.group_name,
        sa.raw_ingredient_text
      ORDER BY dis.standard_term;
    `;

    const result = await this.dataSource.query(query, [drugId]);

    return result.map((ing: any) => ({
      standard_id: ing.standard_id,
      standard_term: ing.standard_term,
      group_id: ing.group_id,
      group_name: ing.group_name,
      raw_text: ing.raw_ingredient_text,
      synonyms: ing.synonyms || [],
    }));
  }
}
```

---

### Approach 2: Separate Ingredient Endpoint (Best for Performance)

**New Endpoint:** `GET /drugs/:id/ingredients`

**Benefits:**
- Main `/drugs` endpoint stays fast and lightweight
- Clients can fetch ingredient details only when needed
- Better for list views where ingredient details aren't needed

**Example:**

```typescript
// drugs.controller.ts
@Get(':id/ingredients')
@ApiOperation({ summary: 'Get standardized ingredients for a drug' })
async getDrugIngredients(@Param('id') id: string) {
  return this.drugsService.getStandardizedIngredients(+id);
}
```

**Usage:**
```bash
# Get drug list (fast, no ingredient details)
GET /drugs?limit=20

# Get specific drug with ingredients
GET /drugs/123
GET /drugs/123/ingredients
```

---

### Approach 3: Use drug_ingredient_search_v2 as Primary Table (Best for Search)

**Use the search table as your main query source:**

```typescript
@Get('catalog')
@ApiOperation({
  summary: 'Get drug catalog with standardized ingredients',
  description: 'Returns drugs with all ingredient standardization data from drug_ingredient_search_v2',
})
async getCatalog(
  @Query('page') page = 1,
  @Query('limit') limit = 20,
  @Query('ingredient') ingredient?: string,
  @Query('group') group?: string,
) {
  const query = `
    SELECT
      dis.drug_id,
      dis.drug_name,
      dis.company,
      dis.price,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'standard_id', dis.standard_id,
          'standard_term', dis.standard_term,
          'group_id', dis.group_id,
          'group_name', dis.group_name
        )
      ) as ingredients
    FROM reference.drug_ingredient_search_v2 dis
    WHERE 1=1
      ${ingredient ? `AND dis.standard_term ILIKE '%${ingredient}%'` : ''}
      ${group ? `AND dis.group_name ILIKE '%${group}%'` : ''}
    GROUP BY dis.drug_id, dis.drug_name, dis.company, dis.price
    ORDER BY dis.drug_name
    LIMIT $1 OFFSET $2
  `;

  const offset = (page - 1) * limit;
  return this.dataSource.query(query, [limit, offset]);
}
```

**Returns:**
```json
{
  "drug_id": 2,
  "drug_name": "1 2 3 syrup",
  "company": "hikma",
  "price": "32.00",
  "ingredients": [
    { "standard_id": 156, "standard_term": "Paracetamol", "group_id": 23, "group_name": "Analgesics" },
    { "standard_id": 892, "standard_term": "Pseudoephedrine", "group_id": 45, "group_name": "Decongestants" }
  ]
}
```

---

## Recommendation

### For `/drugs` (Main List Endpoint)

**Use Approach 2 (Separate Endpoint) for list views:**
- Keep `/drugs` fast and lightweight
- Add `/drugs/:id/ingredients` for details

**Why:**
- List views (20-100 drugs) don't need full ingredient data
- Better performance when paginating through catalog
- Clients decide when to load ingredient details

### For `/drugs/:id` (Single Drug)

**Use Approach 1 (Auto-Enrich) for single drug:**
- When viewing one drug, always include standardized ingredients
- Better UX - one request gets everything

### For Search Endpoints

**Use drug_ingredient_search_v2 directly:**
- `/drugs/search/ingredient` already uses it ✅
- `/drugs/search` (unified) already uses it ✅
- These endpoints SHOULD return standardized data

---

## Implementation Plan

### Step 1: Add DataSource Injection

```typescript
// drugs.service.ts
constructor(
  @InjectRepository(Drug)
  private drugsRepository: Repository<Drug>,
  private dataSource: DataSource,  // ← Add this
) {}
```

### Step 2: Add getStandardizedIngredients Method

```typescript
async getStandardizedIngredients(drugId: number) {
  const query = `
    SELECT DISTINCT
      dis.standard_id,
      dis.standard_term,
      dis.group_id,
      dis.group_name,
      sa.raw_ingredient_text,
      ARRAY_AGG(DISTINCT isyn.synonym_text)
        FILTER (WHERE isyn.synonym_text IS NOT NULL) as synonyms
    FROM reference.drug_ingredient_search_v2 dis
    LEFT JOIN reference.single_actives sa
      ON dis.single_active_id = sa.single_active_id
    LEFT JOIN reference.ingredient_synonyms isyn
      ON dis.standard_id = isyn.standard_id
    WHERE dis.drug_id = $1
    GROUP BY
      dis.standard_id,
      dis.standard_term,
      dis.group_id,
      dis.group_name,
      sa.raw_ingredient_text
    ORDER BY dis.standard_term;
  `;

  const result = await this.dataSource.query(query, [drugId]);

  return result.map((ing: any) => ({
    standard_id: ing.standard_id,
    standard_term: ing.standard_term,
    group_id: ing.group_id,
    group_name: ing.group_name,
    raw_text: ing.raw_ingredient_text,
    synonyms: ing.synonyms || [],
  }));
}
```

### Step 3: Update findOne to Auto-Enrich

```typescript
async findOne(id: number) {
  const drug = await this.drugsRepository.findOne({ where: { drug_id: id } });
  if (!drug) return null;

  return {
    ...drug,
    ingredients: await this.getStandardizedIngredients(id),
  };
}
```

### Step 4: Add Ingredients Endpoint

```typescript
// drugs.controller.ts
@Get(':id/ingredients')
@ApiOperation({ summary: 'Get standardized ingredients for a specific drug' })
@ApiResponse({
  status: 200,
  description: 'Returns standardized ingredient information with groups and synonyms',
})
async getDrugIngredients(@Param('id') id: string) {
  return this.drugsService.getStandardizedIngredients(+id);
}
```

### Step 5: Optional - Query Parameter for Lists

```typescript
@Get()
async findAll(
  @Paginate() query: PaginateQuery,
  @Query('include_ingredients') includeIngredients?: string,
) {
  const result = await paginate(query, this.drugsRepository, DRUG_PAGINATION_CONFIG);

  // Only enrich if explicitly requested
  if (includeIngredients === 'true') {
    const enrichedData = await Promise.all(
      result.data.map(async (drug) => ({
        ...drug,
        ingredients: await this.getStandardizedIngredients(drug.drug_id),
      })),
    );
    return { ...result, data: enrichedData };
  }

  return result;
}
```

**Usage:**
```bash
# Fast list (no ingredients)
GET /drugs?limit=20

# Enriched list (with ingredients)
GET /drugs?limit=20&include_ingredients=true

# Single drug (always includes ingredients)
GET /drugs/123
```

---

## Summary

| Endpoint | Returns Ingredients? | Why |
|----------|---------------------|-----|
| `GET /drugs` | Optional (query param) | Performance - let client decide |
| `GET /drugs/:id` | Yes (auto-enriched) | Single drug = full details |
| `GET /drugs/:id/ingredients` | Yes | Dedicated endpoint for flexibility |
| `GET /drugs/search` | Yes | Search needs standardized data |
| `GET /drugs/search/ingredient` | Yes | Already uses standardized data |

**Best Practice:** Start with Approach 2 (separate endpoint), then add query parameter to main endpoint if needed.

This gives you maximum flexibility and performance!
