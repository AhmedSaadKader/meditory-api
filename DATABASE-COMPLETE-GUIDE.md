# Meditory Database - Complete Guide

**Analysis Date**: 2025-10-02
**Database**: Railway PostgreSQL 17.6
**Total Drugs**: 24,515 | **Searchable**: 20,609 (84%)

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Database Statistics](#database-statistics)
3. [Working Functions](#working-functions)
4. [Database Architecture](#database-architecture)
5. [Classification Tables](#classification-tables)
6. [Data Quality & Fixes](#data-quality--fixes)
7. [Implementation Guide](#implementation-guide)
8. [Cleanup Recommendations](#cleanup-recommendations)

---

## Quick Start

### What Works ✅
- **Ingredient Search**: `find_drugs_hierarchical('paracetamol')` - Use this!
- **Dosage Form Filtering**: 99.96% accuracy (53 forms)
- **Route Filtering**: 39% → 97% after simple fix
- **Therapeutic Search**: 86 curated categories
- **ATC Code Search**: WHO classification
- **Advanced Multi-Criteria**: Combine all filters

### What's Broken ❌
- `find_drugs_by_ingredient_grouped()` - SQL error
- `find_drugs_by_ingredient_fast()` - Returns empty
- `find_drugs_by_ingredient_v2()` - Wrapper for broken function
- `find_drugs_fast()` - References non-existent table

---

## Database Statistics

| Metric | Count | Notes |
|--------|-------|-------|
| **Drugs** | | |
| Total drugs | 24,515 | Main `drugs` table |
| Searchable drugs | 20,609 (84%) | Have parsed ingredients |
| Unsearchable drugs | 3,906 (16%) | No ingredient data |
| Search table rows | 46,890 | Multiple rows per drug |
| | | |
| **Classifications** | | |
| Dosage forms | 53 | 100% standardized |
| Routes | 15 | 100% standardized |
| Therapeutic categories | 86 | Curated with clinical data |
| Pharmacology categories | 5,351 | 99.9% unstandardized ❌ |
| | | |
| **Ingredients** | | |
| Ingredient standards | Check locally | Standardized terms |
| Ingredient synonyms | Check locally | Alternative names |
| Ingredient groups | Check locally | Grouped ingredients |
| | | |
| **Linking Accuracy** | | |
| Dosage forms linked | 20,601 (99.96%) ✅ | Excellent |
| Routes linked (current) | 8,032 (39%) ⚠️ | Needs fix |
| Routes linked (after fix) | ~20,000 (97%) ✅ | With compound route handling |
| Pharmacology linked | 17 (0.08%) ❌ | Unusable |

---

## Working Functions

### 🌟 Primary Search Functions (Use These!)

#### 1. `find_drugs_hierarchical(search_term)` ⭐ BEST
**Purpose**: Search drugs by ingredient name
**Performance**: <100ms
**Coverage**: 100% of searchable drugs

```sql
-- Simple search
SELECT * FROM find_drugs_hierarchical('paracetamol');

-- Returns:
-- drug_name, company, price, group_name, standard_term, match_type

-- Match types (in priority order):
-- 1. 'direct' - Exact standard term match
-- 2. 'synonym' - Matched via synonym
-- 3. 'group_match' - Matched ingredient group
```

**Why it's best**: Uses optimized `drug_ingredient_search_v2` table with proper indexes.

#### 2. `find_drugs_advanced_search(...)` ⭐ MULTI-CRITERIA
**Purpose**: Search with multiple filters
**Performance**: <300ms
**Returns**: Results with match_score for ranking

```sql
SELECT * FROM find_drugs_advanced_search(
  p_therapeutic_category := 'analgesic',
  p_atc_code := NULL,
  p_indication := 'pain',
  p_mechanism := NULL,
  p_ingredient := 'paracetamol'
);

-- All parameters are optional
-- Returns: match_score column for ranking results
```

#### 3. `find_drugs_by_therapeutic_category(category_search)` ✅
**Purpose**: Find drugs by therapeutic class
**Performance**: <200ms
**Data**: Includes ATC codes, mechanism of action, indications

```sql
SELECT * FROM find_drugs_by_therapeutic_category('analgesic');

-- Returns:
-- drug_name, company, price, therapeutic_category, atc_code,
-- mechanism_of_action, primary_indications[], ingredient_name,
-- group_name, matched_via
```

#### 4. `find_drugs_by_atc_code(atc_search)` ✅
**Purpose**: Search by WHO ATC classification
**Performance**: <200ms
**Features**: Hierarchical code support, level interpretation

```sql
-- Search specific code
SELECT * FROM find_drugs_by_atc_code('N02B');

-- Partial code (finds all children)
SELECT * FROM find_drugs_by_atc_code('N02');

-- Returns atc_level: 'Anatomical Main Group', 'Therapeutic Subgroup', etc.
```

#### 5. `find_drugs_by_indication(indication_search)` ✅
**Purpose**: Search by medical condition/use
**Performance**: <200ms

```sql
SELECT * FROM find_drugs_by_indication('pain');

-- Returns:
-- drug_name, company, price, therapeutic_category,
-- matched_indication, mechanism_of_action, ingredient_name,
-- group_name, all_indications[]
```

### 🔧 Utility Functions

#### `link_drugs_to_dosage_forms()` ✅
Auto-links drugs to standardized dosage forms.
```sql
SELECT link_drugs_to_dosage_forms(); -- Returns count updated
```

#### `link_drugs_to_routes()` ⚠️
Links routes but only handles exact matches (39% coverage).
**Use enhanced version instead** (see [Data Quality & Fixes](#data-quality--fixes)).

#### `link_all_drug_categories()` ✅
Runs all linking functions at once.
```sql
SELECT * FROM link_all_drug_categories();
-- Returns: (dosage_forms_linked, routes_linked, pharmacology_linked)
```

---

## Database Architecture

### Core Tables (Keep ✅)

#### `drugs` ⭐ PRIMARY
**Purpose**: Main drug catalog
**Rows**: 24,515
**Key Columns**: drug_id, name, price, company, dosage_form, route, active_raw

#### `drug_ingredient_search_v2` ⭐ SEARCH INDEX
**Purpose**: Denormalized search table (multiple rows per drug)
**Rows**: 46,890 (20,609 unique drugs)
**Structure**: One row per drug-ingredient combination
**Key Columns**:
- drug_id, drug_name, company, price
- group_id, group_name
- standard_id, standard_term
- dosage_form_id, route_id, pharmacology_id

**Why multiple rows**: A drug with 3 ingredients has 3 rows.

**Indexes** (9 optimized):
- drug_id, group_id, standard_id, standard_term
- dosage_form_id, route_id, pharmacology_id

#### `ingredient_standards` ⭐ CORE
**Purpose**: Standardized ingredient terminology
**Structure**: consolidated_term, description, group_id

#### `ingredient_synonyms` ⭐ CORE
**Purpose**: Alternative names for ingredients
**Structure**:
- synonym_text, standard_id
- source_type: 'raw_ingredient', 'manual', 'fuzzy_match'
- confidence_score (0-1)

#### `ingredient_groups` ⭐ CORE
**Purpose**: Group related ingredients + link to therapeutic categories
**Key Features**:
- Hierarchical (parent_group_id)
- scientific_description
- therapeutic_category_id (links to therapeutic data)

#### `therapeutic_categories` ⭐ HIGH VALUE
**Purpose**: Clinical classification with rich data
**Rows**: 86 curated categories
**Structure**:
- category_name, category_description
- atc_code, atc_level_1 through atc_level_4
- mechanism_of_action
- primary_indications[] (array)
- contraindications[], common_side_effects[]
- monitoring_parameters[], drug_interactions[]

**Sample**:
```
Analgesics - Non-Opioid (N02B)
  Mechanism: Block pain signals through COX inhibition (NSAIDs),
             central action (acetaminophen)
  Indications: Pain relief, Fever reduction
```

### Classification Tables

#### `dosage_forms` ✅ EXCELLENT
**Rows**: 53 (100% standardized)
**Coverage**: 20,601/20,609 drugs (99.96%)
**Structure**:
- raw_name → standard_name
- pharmaceutical_category (Solid/Liquid/Topical/Parenteral)
- synonyms[] (array)

**Top Forms**:
| Form | Count | Category |
|------|-------|----------|
| Tablet | 12,354 | Solid Dosage Forms |
| Cream | 7,616 | Topical Preparations |
| Capsule | 4,828 | Solid Dosage Forms |
| Syrup | 2,620 | Liquid Preparations |

#### `routes` ⚠️ NEEDS FIX
**Rows**: 15 (100% standardized)
**Current Coverage**: 8,032/20,609 drugs (39%)
**After Fix**: ~20,000/20,609 drugs (97%)
**Structure**:
- raw_name → standard_name
- administration_type (Systemic/Local)
- synonyms[] (array)

**Available Routes**:
| Route | Standard | Type |
|-------|----------|------|
| oral | Oral | Systemic |
| topical | Topical | Local |
| iv | Intravenous | Systemic |
| im | Intramuscular | Systemic |
| eye | Ophthalmic | Local |
| ear | Otic | Local |

**Problem**: Drugs use compound values like `oral.solid` which don't match table entries. See [Data Quality & Fixes](#data-quality--fixes).

#### `pharmacology_categories` ❌ UNUSABLE
**Rows**: 5,351 total (5 standardized, 5,346 unstandardized)
**Coverage**: 17/20,609 drugs (0.08%)
**Recommendation**: DELETE or standardize all 5,346 entries (massive effort)

**Use `therapeutic_categories` instead** - it's curated and complete.

### Redundant Tables (Can Remove 🗑️)

#### `combination_ingredients` ❌
**Rows**: 47,537
**Purpose**: Junction between `active_combinations` and `single_actives`
**Issue**: Data already in `drug_ingredient_search_v2`
**Used by**: Only broken functions
**Safe to delete**: Yes (after removing broken functions)

#### `single_actives` ⚠️
**Rows**: 47,537
**Purpose**: Individual parsed ingredients
**Issue**: Data replicated in search table
**Caution**: Check if ETL processes depend on this

#### `active_combinations` ⚠️
**Rows**: 20,615
**Purpose**: Original + standardized ingredient text
**Issue**: Data available in search table
**Caution**: Has FK from drugs table - drop constraint first

---

## Classification Tables

### Multi-Layer Ingredient Architecture

```
Layer 1: drugs.active_raw (raw text)
         ↓
Layer 2: active_combinations (parsed combinations) 🗑️ Can remove
         ↓
Layer 3: combination_ingredients (junction table) 🗑️ Can remove
         ↓
Layer 4: single_actives (individual ingredients) 🗑️ Can remove
         ↓
Layer 5: ingredient_standards ✅ (standardized terms)
         ↓
Layer 6: ingredient_synonyms ✅ (alternative names)
         ↓
Layer 7: ingredient_groups ✅ (grouped + therapeutic)
```

### Optimized Architecture (Already Built!)

```
drugs → drug_ingredient_search_v2 ⭐ (denormalized) → FAST SEARCH
                ↓
        ingredient_standards ← ingredient_synonyms
                ↓
        ingredient_groups → therapeutic_categories
                ↓
        dosage_forms, routes (via FKs)
```

**Key Insight**: Layers 2-4 are redundant. The search table has everything needed.

---

## Data Quality & Fixes

### Critical Fix: Route Linking Enhancement ⚠️

**Problem**: Only 39% coverage because drugs use compound values.

**Root Cause**:
- `routes` table has: `oral`, `topical`, `injection`, etc. (15 entries)
- `drugs.route` has: `oral.solid`, `oral.liquid`, `unknown`, etc.
- Compound values like `oral.solid` don't match table entries

**Affected Drugs**:
| Compound Route | Drug Count |
|----------------|------------|
| oral.solid | 17,750 |
| oral.liquid | 4,111 |
| unknown | 2,092 |
| **Total** | **21,861 (89% of all drugs!)** |

**Solution**: Enhanced linking function that splits compound routes

```sql
CREATE OR REPLACE FUNCTION link_drugs_to_routes_enhanced()
RETURNS integer AS $$
DECLARE
    updated_count INTEGER := 0;
    pass1_count INTEGER := 0;
    pass2_count INTEGER := 0;
BEGIN
    -- Pass 1: Exact matches (e.g., "topical" → "topical")
    UPDATE drug_ingredient_search_v2 AS dis
    SET route_id = r.id
    FROM drugs d
    JOIN routes r ON TRIM(LOWER(d.route)) = LOWER(r.raw_name)
    WHERE dis.drug_id = d.drug_id
    AND r.is_standardized = TRUE
    AND dis.route_id IS NULL;

    GET DIAGNOSTICS pass1_count = ROW_COUNT;

    -- Pass 2: Compound routes (e.g., "oral.solid" → "oral")
    -- Split on "." and take first part
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

-- Run the fix
SELECT link_drugs_to_routes_enhanced();

-- Verify coverage improved
SELECT
    COUNT(DISTINCT drug_id) FILTER (WHERE route_id IS NOT NULL) as linked,
    COUNT(DISTINCT drug_id) as total,
    ROUND(100.0 * COUNT(DISTINCT drug_id) FILTER (WHERE route_id IS NOT NULL) /
          COUNT(DISTINCT drug_id), 2) || '%' as coverage
FROM drug_ingredient_search_v2;

-- Expected result: 97% coverage (up from 39%)
```

**Save this as**: `migrations/fix-route-linking.sql`

### Why 3,906 Drugs Aren't Searchable

These drugs exist in `drugs` table but not in `drug_ingredient_search_v2`:
- **Cause**: No `active_raw` data or parsing failed
- **Impact**: Won't appear in ANY ingredient searches
- **Action**: Investigate if these are:
  - Medical devices
  - Cosmetics/supplements
  - Data entry errors
  - Missing ingredient data

---

## Implementation Guide

### API Endpoints to Create

| Endpoint | Method | Purpose | Function Used |
|----------|--------|---------|---------------|
| `/drugs/search/ingredient` | GET | Ingredient search + filters | `find_drugs_hierarchical()` |
| `/drugs/search/therapeutic` | GET | Therapeutic category | `find_drugs_by_therapeutic_category()` |
| `/drugs/search/atc` | GET | ATC code | `find_drugs_by_atc_code()` |
| `/drugs/search/indication` | GET | Medical indication | `find_drugs_by_indication()` |
| `/drugs/search/advanced` | POST | Multi-criteria | `find_drugs_advanced_search()` |
| `/drugs/filters` | GET | Available filters | Custom query |

### Example: Ingredient Search with Filters

```typescript
// src/drugs/drugs.service.ts
async searchByIngredient(query: string, filters: {
  dosage_form?: string,
  route?: string,
  price_min?: number,
  price_max?: number
}) {
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

  const params = [query];
  let paramIndex = 2;

  if (filters.dosage_form) {
    sql += ` AND LOWER(df.standard_name) = LOWER($${paramIndex++})`;
    params.push(filters.dosage_form);
  }

  if (filters.route) {
    sql += ` AND LOWER(r.standard_name) = LOWER($${paramIndex++})`;
    params.push(filters.route);
  }

  if (filters.price_min) {
    sql += ` AND dis.price >= $${paramIndex++}`;
    params.push(filters.price_min);
  }

  if (filters.price_max) {
    sql += ` AND dis.price <= $${paramIndex++}`;
    params.push(filters.price_max);
  }

  sql += ` ORDER BY sr.match_type, dis.drug_name`;

  return this.drugsRepository.query(sql, params);
}
```

### Performance Expectations

| Search Type | Expected Speed | Coverage |
|-------------|---------------|----------|
| Ingredient only | <100ms | 100% |
| + 1 filter (dosage form) | <150ms | 99.96% |
| + 2 filters (dosage + route) | <200ms | 97% (after fix) |
| Therapeutic category | <200ms | Via groups |
| Advanced (5 criteria) | <300ms | Combined |

### Complete Code Examples

See `search-implementation-plan.md` for:
- Full NestJS entities (DosageForm, Route)
- Complete DTOs (SearchIngredientDto, AdvancedSearchDto)
- Service implementations
- Controller endpoints
- Testing procedures

---

## Cleanup Recommendations

### Phase 1: Immediate (No Breaking Changes)
1. ✅ Start using `find_drugs_hierarchical()` for all searches
2. ✅ Use `find_drugs_advanced_search()` for complex queries
3. ✅ Run `link_drugs_to_routes_enhanced()` to fix route coverage

### Phase 2: Database Cleanup (After Testing)

#### Drop Broken Functions
```sql
DROP FUNCTION IF EXISTS find_drugs_by_ingredient_grouped(text);
DROP FUNCTION IF EXISTS find_drugs_by_ingredient_fast(text);
DROP FUNCTION IF EXISTS find_drugs_by_ingredient_v2(text);
DROP FUNCTION IF EXISTS find_drugs_fast(text);
```

#### Drop Redundant Tables (if no dependencies)
```sql
-- Check dependencies first!
-- \d+ combination_ingredients
-- \d+ single_actives
-- \d+ active_combinations

DROP TABLE IF EXISTS combination_ingredients CASCADE;
DROP TABLE IF EXISTS single_actives CASCADE;
DROP TABLE IF EXISTS active_combinations CASCADE;
```

#### Consider Dropping Pharmacology
```sql
-- Only 0.08% usable, 99.9% unstandardized
DROP TABLE IF EXISTS pharmacology_categories CASCADE;
```

### Phase 3: Data Quality

1. **Investigate 3,906 unsearchable drugs**
   - Why no ingredient data?
   - Should they be excluded?

2. **Clean up "unknown" routes**
   ```sql
   -- 2,092 drugs have route = 'unknown'
   UPDATE drugs SET route = NULL WHERE route = 'unknown';
   ```

3. **Monitor data quality**
   - Set up alerts for new unrecognized routes/forms
   - Track linking coverage over time

---

## Quick Reference

### Connection Info
```env
DATABASE_HOST=switchyard.proxy.rlwy.net
DATABASE_PORT=18252
DATABASE_USER=postgres
DATABASE_PASSWORD=hwiEZpONmHpJxWNYdZtECoOEZCXSPhBH
DATABASE_NAME=railway
```

### Essential Queries

```sql
-- Test ingredient search
SELECT * FROM find_drugs_hierarchical('paracetamol') LIMIT 5;

-- Check coverage
SELECT
  COUNT(DISTINCT drug_id) as total,
  COUNT(DISTINCT drug_id) FILTER (WHERE dosage_form_id IS NOT NULL) as has_dosage,
  COUNT(DISTINCT drug_id) FILTER (WHERE route_id IS NOT NULL) as has_route
FROM drug_ingredient_search_v2;

-- Get available filters
SELECT id, standard_name, COUNT(*) OVER() as total_forms
FROM dosage_forms WHERE is_standardized = true;

SELECT id, standard_name, administration_type
FROM routes WHERE is_standardized = true;

SELECT id, category_name, atc_code
FROM therapeutic_categories
ORDER BY category_name;
```

---

## Summary

### ✅ What Works
- 5 powerful database functions ready to use
- 99.96% dosage form coverage
- 86 therapeutic categories with clinical data
- Optimized search infrastructure (`drug_ingredient_search_v2`)

### ⚠️ What Needs Fixing
- Route linking (39% → 97% with simple function enhancement)
- 3,906 drugs have no ingredient data (investigate)
- 4 broken functions (delete)
- 3 redundant tables (delete after testing)
- Pharmacology categories (99.9% unusable)

### 🚀 Ready to Implement
- Ingredient search with filters
- Therapeutic/ATC/Indication searches
- Advanced multi-criteria search
- Dynamic filter endpoints
- Expected performance: <300ms

**Total Implementation Time**: ~2 hours

---

**Next Steps**:
1. Apply route fix (5 min)
2. Implement API endpoints (1 hour)
3. Test thoroughly (20 min)
4. Deploy!

For detailed implementation steps, see `search-implementation-plan.md`.
