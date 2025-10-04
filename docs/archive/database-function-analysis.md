# Database Function & Table Analysis

## Executive Summary

Analysis of 24 database functions and 19 tables reveals significant redundancy. **Only 5 functions are useful**, while 4 are broken or return empty results. Several tables can be safely removed as their data is replicated in the optimized search table.

---

## ✅ RECOMMENDED FUNCTIONS (Keep & Use)

### 1. `find_drugs_hierarchical(search_term)` ⭐ **PRIMARY SEARCH FUNCTION**
- **Status**: Working & Fast
- **Use Case**: Main ingredient search
- **Returns**: drug_name, company, price, group_name, standard_term, match_type
- **Search Levels**:
  1. Direct group/standard match (priority 1)
  2. Synonym-based search (priority 2)
  3. Group match via synonyms (priority 3)
- **Why Best**: Uses optimized `drug_ingredient_search_v2` table
- **Example**: `SELECT * FROM find_drugs_hierarchical('paracetamol');`

### 2. `find_drugs_advanced_search()` ⭐ **MULTI-CRITERIA SEARCH**
- **Status**: Working
- **Use Case**: Complex searches with multiple filters
- **Parameters**:
  - `p_therapeutic_category` (optional)
  - `p_atc_code` (optional)
  - `p_indication` (optional)
  - `p_mechanism` (optional)
  - `p_ingredient` (optional)
- **Returns**: Includes match_score for ranking
- **Example**:
  ```sql
  SELECT * FROM find_drugs_advanced_search(
    p_therapeutic_category := 'analgesic',
    p_ingredient := 'paracetamol'
  );
  ```

### 3. `find_drugs_by_therapeutic_category(category_search)` ⭐ **USEFUL**
- **Status**: Working
- **Use Case**: Find drugs by therapeutic classification
- **Returns**: Includes ATC codes, mechanism of action, indications
- **Matches**: Category name, ATC code, or primary indications
- **Example**: `SELECT * FROM find_drugs_by_therapeutic_category('analgesic');`

### 4. `find_drugs_by_indication(indication_search)` ⭐ **USEFUL**
- **Status**: Working
- **Use Case**: Search by medical condition/use
- **Returns**: Shows matched indication and all indications
- **Example**: `SELECT * FROM find_drugs_by_indication('pain');`

### 5. `find_drugs_by_atc_code(atc_search)` ⭐ **USEFUL**
- **Status**: Working
- **Use Case**: Search by WHO ATC classification
- **Returns**: Includes ATC level interpretation
- **Example**: `SELECT * FROM find_drugs_by_atc_code('N02');`

---

## ❌ BROKEN/USELESS FUNCTIONS (Remove)

### 1. `find_drugs_by_ingredient_grouped(ingredient_name)` ❌
- **Status**: SQL Error
- **Issue**: Ambiguous column reference "matched_via" at line 79
- **Problem**: Variable name conflicts with column alias
- **Performance**: Uses slow multi-join path through active_combinations → combination_ingredients → single_actives
- **Recommendation**: DELETE - use `find_drugs_hierarchical()` instead

### 2. `find_drugs_by_ingredient_fast(ingredient_name)` ❌
- **Status**: Returns 0 results
- **Issue**: Depends on `drug_groups` table but logic is flawed
- **Performance**: Actually slower than `find_drugs_hierarchical()`
- **Recommendation**: DELETE

### 3. `find_drugs_by_ingredient_v2(ingredient_name)` ❌
- **Status**: Broken (wrapper)
- **Issue**: Just calls broken `find_drugs_by_ingredient_grouped()`
- **Recommendation**: DELETE

### 4. `find_drugs_fast(ingredient_name)` ❌
- **Status**: References non-existent table
- **Issue**: Queries `drug_ingredient_search` (table doesn't exist - should be `drug_ingredient_search_v2`)
- **Recommendation**: DELETE or FIX to use correct table name

---

## 🗑️ TABLES - REMOVAL CANDIDATES

### Can Remove (Redundant Data)

#### 1. `combination_ingredients` ❌
- **Rows**: 47,537
- **Purpose**: Junction table between `active_combinations` and `single_actives`
- **Issue**: Data already present in `drug_ingredient_search_v2`
- **Used By**: Only broken functions
- **Recommendation**: SAFE TO DELETE after removing broken functions

#### 2. `single_actives` ⚠️
- **Rows**: 47,537
- **Purpose**: Individual parsed ingredients from raw text
- **Issue**: Data replicated in `drug_ingredient_search_v2`
- **Used By**: Only broken functions
- **Recommendation**: PROBABLY SAFE TO DELETE after removing broken functions
- **Note**: Check if any ETL/import processes depend on this

#### 3. `active_combinations` ⚠️
- **Rows**: 20,615
- **Purpose**: Original + standardized active ingredient text
- **Issue**: Data available in `drug_ingredient_search_v2`
- **Used By**: Foreign key from `drugs` table, broken functions
- **Recommendation**: CONSIDER DELETING after removing broken functions
- **Caution**: Has FK constraint from `drugs.drug_id`, may need to drop constraint first

---

## ✅ CORE TABLES (Keep)

### Primary Search Infrastructure

#### 1. `drug_ingredient_search_v2` ⭐ **MAIN SEARCH TABLE**
- **Rows**: 46,890
- **Purpose**: Denormalized search index
- **Contains**: drug_id, drug_name, company, price, group_id, group_name, standard_id, standard_term, dosage_form_id, route_id, pharmacology_id
- **Indexes**: 9 optimized indexes for fast searching
- **Status**: ESSENTIAL - used by all working functions

#### 2. `ingredient_standards` ⭐ **CORE**
- **Purpose**: Standardized ingredient terminology
- **Contains**: consolidated_term, description, group_id
- **Status**: ESSENTIAL - referenced by synonyms and search table

#### 3. `ingredient_synonyms` ⭐ **CORE**
- **Purpose**: Alternative names and spellings for ingredients
- **Contains**: synonym_text, standard_id, source_type, confidence_score
- **Status**: ESSENTIAL - enables flexible search matching

#### 4. `ingredient_groups` ⭐ **CORE**
- **Purpose**: Groups related ingredients, links to therapeutic categories
- **Contains**: group_name, group_description, parent_group_id (hierarchical), scientific_description, therapeutic_category_id
- **Status**: ESSENTIAL - enables group-based search and therapeutic linking

#### 5. `drug_groups` ⭐ **KEEP**
- **Rows**: 8,879
- **Purpose**: Links drugs to ingredient groups
- **Status**: Referenced by some functions, keep for now

#### 6. `drugs` ⭐ **CORE**
- **Purpose**: Main drug catalog
- **Contains**: name, price, company, dosage_form, etc.
- **Status**: ESSENTIAL - primary data source

---

## 📊 Data Flow Analysis

### Current Multi-Layer Architecture

```
Layer 1: drugs.active_raw (raw text)
         ↓
Layer 2: active_combinations (parsed combinations)
         ↓
Layer 3: combination_ingredients (junction table)
         ↓
Layer 4: single_actives (individual ingredients)
         ↓
Layer 5: ingredient_standards (standardized terms)
         ↓
Layer 6: ingredient_synonyms (alternative names)
         ↓
Layer 7: ingredient_groups (grouped + therapeutic)
```

### Optimized Architecture (Already Built)

```
drugs → drug_ingredient_search_v2 (denormalized) → FAST SEARCH
                ↓
        ingredient_standards ← ingredient_synonyms
                ↓
        ingredient_groups → therapeutic_categories
```

---

## 🎯 ACTION PLAN

### Phase 1: Immediate (No Breaking Changes)
1. ✅ Start using `find_drugs_hierarchical()` for all ingredient searches
2. ✅ Use `find_drugs_advanced_search()` for complex queries
3. ✅ Document the 5 working functions for API implementation

### Phase 2: Cleanup (After Testing)
1. ❌ Drop broken functions:
   - `find_drugs_by_ingredient_grouped()`
   - `find_drugs_by_ingredient_fast()`
   - `find_drugs_by_ingredient_v2()`
   - `find_drugs_fast()`

2. ❌ Drop redundant tables (if no dependencies):
   - `combination_ingredients`
   - `single_actives`
   - `active_combinations` (check FK constraint first)

### Phase 3: Monitoring
1. Monitor `drug_ingredient_search_v2` for completeness
2. Ensure ETL processes update the search table correctly
3. Verify no external dependencies on removed tables

---

## 🔍 Search Performance Comparison

| Function | Uses Optimized Table | Status | Speed |
|----------|---------------------|--------|-------|
| `find_drugs_hierarchical()` | ✅ Yes (`drug_ingredient_search_v2`) | ✅ Working | Fast |
| `find_drugs_advanced_search()` | ❌ No (joins many tables) | ✅ Working | Medium |
| `find_drugs_by_ingredient_grouped()` | ❌ No (complex joins) | ❌ Broken | N/A |
| `find_drugs_by_ingredient_fast()` | ❌ No (`drug_groups`) | ❌ Empty | Slow |
| `find_drugs_fast()` | ❌ Wrong table name | ❌ Broken | N/A |

---

## 💡 Key Insights

1. **`drug_ingredient_search_v2` is the MVP** - All searches should use this table
2. **4 out of 8 ingredient search functions are broken/useless** - 50% waste
3. **3 tables can be removed** - Data is duplicated in the search table
4. **The working functions cover all use cases**:
   - Basic ingredient search: `find_drugs_hierarchical()`
   - Complex multi-criteria: `find_drugs_advanced_search()`
   - Therapeutic category: `find_drugs_by_therapeutic_category()`
   - Medical indication: `find_drugs_by_indication()`
   - ATC classification: `find_drugs_by_atc_code()`

---

## 🏷️ Drug Classification Tables (Dosage Forms, Routes, Pharmacology, Therapeutic)

### Overview

These tables standardize raw drug attributes and link them to the search index. They enable filtering and categorization beyond ingredient search.

### 1. `dosage_forms` ✅ **FULLY STANDARDIZED & ACTIVE**
- **Rows**: 53 (all standardized)
- **Purpose**: Standardize dosage form terminology (tablet, capsule, syrup, etc.)
- **Structure**:
  - `raw_name` → `standard_name` mapping
  - `pharmaceutical_category` (Solid/Liquid/Topical/Parenteral)
  - `synonyms[]` array for variants
  - `is_standardized` = TRUE for all 53 rows
- **Usage**: 26,645 drugs (57% of search table) have linked dosage forms
- **Status**: ✅ **KEEP - ACTIVELY USED**
- **Linked via**: `drug_ingredient_search_v2.dosage_form_id`

**Sample Data**:
```
tablet    → Tablet    (Solid Dosage Forms)
capsule   → Capsule   (Solid Dosage Forms)
syrup     → Syrup     (Liquid Preparations)
cream     → Cream     (Topical Preparations)
ampoule   → Ampoule   (Parenteral Preparations)
```

### 2. `routes` ✅ **FULLY STANDARDIZED & ACTIVE**
- **Rows**: 15 (all standardized)
- **Purpose**: Standardize administration routes
- **Structure**:
  - `raw_name` → `standard_name` mapping
  - `administration_type` (Systemic/Local)
  - `synonyms[]` array for variants
  - `is_standardized` = TRUE for all 15 rows
- **Usage**: 14,190 drugs (30% of search table) have linked routes
- **Status**: ✅ **KEEP - ACTIVELY USED**
- **Linked via**: `drug_ingredient_search_v2.route_id`

**Sample Data**:
```
oral       → Oral          (Systemic)
iv         → Intravenous   (Systemic)
im         → Intramuscular (Systemic)
topical    → Topical       (Local)
eye        → Ophthalmic    (Local)
ear        → Otic          (Local)
inhalation → Inhalation    (Systemic)
```

### 3. `pharmacology_categories` ⚠️ **99.9% UNSTANDARDIZED**
- **Rows**: 5,351 total
  - **Standardized**: 5 (0.09%)
  - **Unstandardized**: 5,346 (99.91%)
- **Purpose**: Pharmacological classification (appears to be auto-imported from raw data)
- **Structure**:
  - `raw_name` → `standard_name`
  - `therapeutic_class`, `atc_category`
  - `synonyms[]`
  - `is_standardized` flag
- **Usage**: Only 17 drugs (0.04% of search table) have linked pharmacology
- **Status**: ⚠️ **MOSTLY USELESS - NEEDS STANDARDIZATION OR REMOVAL**
- **Issue**: 5,346 unique raw values are unstandardized, making this table effectively unusable
- **Recommendation**:
  - Either standardize these 5,346 entries (huge effort)
  - Or delete and rely on `therapeutic_categories` instead

### 4. `therapeutic_categories` ✅ **CURATED & VALUABLE**
- **Rows**: 86 categories
- **Purpose**: High-level therapeutic classification with clinical information
- **Structure**:
  - `category_name` (unique)
  - `atc_code` + hierarchical levels (`atc_level_1` through `atc_level_4`)
  - `mechanism_of_action` (clinical description)
  - `primary_indications[]` (array of medical uses)
  - `contraindications[]`, `common_side_effects[]`, `monitoring_parameters[]`, `drug_interactions[]`
- **Usage**: Linked via `ingredient_groups.therapeutic_category_id`
- **Status**: ✅ **KEEP - HIGH VALUE**
- **Links**: Used by `find_drugs_by_therapeutic_category()`, `find_drugs_by_indication()`, `find_drugs_by_atc_code()`

**Sample Data**:
```
Analgesics - Non-Opioid (N02B)
  Mechanism: Block pain signals through COX inhibition (NSAIDs), central action (acetaminophen)

Antibiotics - Penicillins (J01C)
  Mechanism: Inhibit bacterial cell wall synthesis by binding to penicillin-binding proteins

Antihypertensives - ACE Inhibitors (C09A)
  Mechanism: Block angiotensin-converting enzyme, reducing angiotensin II production
```

---

## 🔗 Linking Functions (Utility Functions)

### Working Functions ✅

#### `link_drugs_to_dosage_forms()` ✅
- **Purpose**: Auto-link drugs to standardized dosage forms
- **Method**: Matches `drugs.dosage_form` (raw) → `dosage_forms.raw_name` → updates `drug_ingredient_search_v2.dosage_form_id`
- **Returns**: Count of drugs updated
- **Status**: Working and useful for maintenance

#### `link_drugs_to_routes()` ✅
- **Purpose**: Auto-link drugs to standardized routes
- **Method**: Matches `drugs.route` (raw) → `routes.raw_name` → updates `drug_ingredient_search_v2.route_id`
- **Returns**: Count of drugs updated
- **Status**: Working and useful for maintenance

#### `link_drugs_to_pharmacology()` ⚠️
- **Purpose**: Auto-link drugs to pharmacology categories
- **Method**: Matches `drugs.pharmacology` → `pharmacology_categories.raw_name`
- **Issue**: Only 5 standardized entries exist, so this links almost nothing (17 drugs)
- **Status**: Technically works but practically useless until pharmacology is standardized

#### `link_all_drug_categories()` ✅
- **Purpose**: Runs all three linking functions in one call
- **Returns**: Counts for each linking operation
- **Status**: Convenient wrapper function - keep

---

## 📊 Classification Table Usage Summary

| Table | Total Rows | Standardized | Drugs Linked | Coverage | Status |
|-------|-----------|--------------|--------------|----------|---------|
| `dosage_forms` | 53 | 53 (100%) | 26,645 | 57% | ✅ Keep - Active |
| `routes` | 15 | 15 (100%) | 14,190 | 30% | ✅ Keep - Active |
| `pharmacology_categories` | 5,351 | 5 (0.09%) | 17 | 0.04% | ⚠️ Needs work or delete |
| `therapeutic_categories` | 86 | N/A (curated) | Via groups | Indirect | ✅ Keep - High value |

---

## 🎯 Recommendations for Classification Tables

### Keep & Use ✅
1. **`dosage_forms`** - Fully functional, good coverage
2. **`routes`** - Fully functional, reasonable coverage
3. **`therapeutic_categories`** - Rich clinical data, well-structured
4. **Linking functions** - Keep `link_drugs_to_dosage_forms()` and `link_drugs_to_routes()`

### Fix or Remove ⚠️
1. **`pharmacology_categories`**
   - **Option A**: Massive standardization effort (5,346 entries)
   - **Option B**: Delete table and rely on `therapeutic_categories` instead
   - **Current state**: 99.9% useless

### Search Capabilities by Classification

**You can now search/filter drugs by**:
- ✅ Dosage form (57% coverage) - e.g., "find tablets", "find syrups"
- ✅ Route (30% coverage) - e.g., "oral drugs", "topical drugs"
- ✅ Therapeutic category (via `find_drugs_by_therapeutic_category()`)
- ✅ ATC code (via `find_drugs_by_atc_code()`)
- ✅ Medical indication (via `find_drugs_by_indication()`)
- ❌ Pharmacology class - NOT USABLE (0.04% coverage)

---

## 📝 Notes

- Analysis Date: 2025-10-02
- Database: Railway PostgreSQL
- Total Functions Analyzed: 24
- Total Tables Analyzed: 19
- Functions to Remove: 4
- Tables to Consider Removing: 3
- Classification Tables: 4 (1 needs attention)
