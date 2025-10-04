# Drug Search Implementation - Quick Start Guide

This guide provides step-by-step instructions to implement comprehensive drug search functionality.

---

## 📚 Documentation Index

1. **[database-function-analysis.md](./database-function-analysis.md)** - Complete database analysis
   - 24 functions analyzed (5 useful, 4 broken)
   - 19 tables reviewed
   - Recommendations for cleanup

2. **[linking-accuracy-report.md](./linking-accuracy-report.md)** - Classification linking analysis
   - Dosage forms: 99.96% accuracy ✅
   - Routes: 39% coverage (needs fix) ⚠️
   - Solution provided for route linking

3. **[search-implementation-plan.md](./search-implementation-plan.md)** - Full implementation guide
   - API endpoint design
   - NestJS code examples
   - Testing procedures

---

## 🎯 What You Can Search For

### ✅ Ready to Implement

1. **Ingredient Search** (Primary Feature)
   - Search: "paracetamol", "vitamin c", "ibuprofen"
   - Uses: `find_drugs_hierarchical()` function
   - Coverage: 100% of searchable drugs
   - Speed: <100ms

2. **Dosage Form Filter**
   - Filter: tablet, capsule, syrup, cream, gel, etc.
   - Coverage: 99.96% (20,601/20,609 drugs)
   - 53 standardized forms available

3. **Therapeutic Category Search**
   - Search: "analgesic", "antibiotic", "antihypertensive"
   - 86 curated categories with clinical data
   - Includes mechanism of action, indications

4. **ATC Code Search**
   - Search: "N02B" (analgesics), "J01C" (penicillins)
   - Hierarchical WHO classification

5. **Medical Indication Search**
   - Search: "pain", "hypertension", "infection"
   - Matches against primary_indications array

### ⚠️ Needs Fix First

6. **Route Filter**
   - Filter: oral, topical, IV, etc.
   - Current coverage: 39% ❌
   - After fix: 97% ✅
   - Issue: Compound values like "oral.solid"
   - Solution: See [linking-accuracy-report.md](./linking-accuracy-report.md)

---

## 🚀 Quick Implementation Steps

### Step 1: Database Backup & Setup (30 min)

```bash
# 1. Backup remote database (currently running in background)
# Check status:
ls -lh e:/meditory-api/backups/

# 2. Check local PostgreSQL
psql --version

# 3. Create local database
createdb meditory_local

# 4. Restore backup
psql -d meditory_local -f e:/meditory-api/backups/meditory-db-backup-20251002.sql

# 5. Fix route linking (CRITICAL)
psql -d meditory_local -f e:/meditory-api/migrations/fix-route-linking.sql
```

### Step 2: Update .env (5 min)

Create `.env.local`:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_local_password
DATABASE_NAME=meditory_local
```

### Step 3: Create Database Entities (10 min)

Copy code from [search-implementation-plan.md](./search-implementation-plan.md) section 2.1:
- `src/drugs/entities/dosage-form.entity.ts`
- `src/drugs/entities/route.entity.ts`

### Step 4: Create DTOs (10 min)

Copy code from section 2.2:
- `src/drugs/dto/search-ingredient.dto.ts`
- `src/drugs/dto/advanced-search.dto.ts`

### Step 5: Update Service (30 min)

Add to `src/drugs/drugs.service.ts`:
- `searchByIngredient()`
- `searchByTherapeuticCategory()`
- `searchByAtcCode()`
- `searchByIndication()`
- `advancedSearch()`
- `getAvailableFilters()`

### Step 6: Update Controller (15 min)

Add to `src/drugs/drugs.controller.ts`:
- `GET /search/ingredient`
- `GET /search/therapeutic`
- `GET /search/atc`
- `GET /search/indication`
- `POST /search/advanced`
- `GET /filters`

### Step 7: Update Module (5 min)

Update `src/drugs/drugs.module.ts` to include new entities.

### Step 8: Test (20 min)

```bash
# Start server
npm run start:dev

# Test endpoints
curl "http://localhost:3000/api/drugs/search/ingredient?query=paracetamol"
curl "http://localhost:3000/api/drugs/filters"
```

**Total Time: ~2 hours**

---

## 📊 API Endpoints Summary

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/drugs?search=...` | GET | Current simple search | ✅ Existing |
| `/drugs/search/ingredient` | GET | Ingredient search with filters | 🆕 New |
| `/drugs/search/therapeutic` | GET | Therapeutic category search | 🆕 New |
| `/drugs/search/atc` | GET | ATC code search | 🆕 New |
| `/drugs/search/indication` | GET | Medical indication search | 🆕 New |
| `/drugs/search/advanced` | POST | Multi-criteria search | 🆕 New |
| `/drugs/filters` | GET | Get available filters | 🆕 New |

---

## 🎨 Example API Responses

### Ingredient Search
```json
GET /drugs/search/ingredient?query=paracetamol&dosage_form=tablet&page=1&limit=5

{
  "data": [
    {
      "drug_name": "Panadol 500mg 20 Tablets",
      "company": "GlaxoSmithKline",
      "price": 15.00,
      "group_name": "Paracetamol",
      "standard_term": "Paracetamol (Acetaminophen)",
      "match_type": "direct",
      "dosage_form": "Tablet",
      "route": "Oral"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 5,
    "totalPages": 30
  }
}
```

### Available Filters
```json
GET /drugs/filters

{
  "dosage_forms": [
    { "id": 1, "name": "Tablet", "category": "Solid Dosage Forms", "count": 12354 },
    { "id": 2, "name": "Cream", "category": "Topical Preparations", "count": 7616 },
    { "id": 3, "name": "Capsule", "category": "Solid Dosage Forms", "count": 4828 }
  ],
  "routes": [
    { "id": 1, "name": "Oral", "type": "Systemic", "count": 21861 },
    { "id": 2, "name": "Topical", "type": "Local", "count": 15418 }
  ],
  "therapeutic_categories": [
    {
      "id": 1,
      "name": "Analgesics - Non-Opioid",
      "atc_code": "N02B",
      "mechanism_of_action": "Block pain signals through COX inhibition",
      "primary_indications": ["Pain relief", "Fever reduction"]
    }
  ]
}
```

---

## ⚡ Performance Expectations

| Search Type | Speed | Coverage |
|-------------|-------|----------|
| Ingredient only | <100ms | 100% |
| Ingredient + 1 filter | <150ms | 99% |
| Ingredient + 2 filters | <200ms | 97% |
| Therapeutic category | <200ms | Via groups |
| Advanced (5 criteria) | <300ms | Combined |

---

## 🔧 Critical Fix Required: Route Linking

**Current Problem:**
- Only 39% of drugs have route linked
- 21,861 drugs use compound routes like `oral.solid`, `oral.liquid`
- These don't match the standardized route table

**Solution:**
Create migration file `migrations/fix-route-linking.sql`:

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

-- Verify coverage
SELECT
    COUNT(DISTINCT drug_id) FILTER (WHERE route_id IS NOT NULL) as linked,
    COUNT(DISTINCT drug_id) as total,
    ROUND(100.0 * COUNT(DISTINCT drug_id) FILTER (WHERE route_id IS NOT NULL) /
          COUNT(DISTINCT drug_id), 2) || '%' as coverage
FROM drug_ingredient_search_v2;
```

**Expected Result:**
```
Pass 1 (exact): 9676 rows
Pass 2 (compound): ~12000 rows
Total: ~21676 rows

linked | total  | coverage
-------|--------|----------
 20000 | 20609  | 97%
```

---

## 🎓 Database Architecture Overview

### Core Tables
- `drugs` (24,515 drugs) - Main catalog
- `drug_ingredient_search_v2` (46,890 rows, 20,609 unique drugs) - **Optimized search index**
- `ingredient_standards` - Standardized ingredient terms
- `ingredient_synonyms` - Alternative names
- `ingredient_groups` - Grouped ingredients
- `therapeutic_categories` (86 categories) - Clinical classification

### Classification Tables
- `dosage_forms` (53 forms) - ✅ 99.96% linked
- `routes` (15 routes) - ⚠️ 39% linked (needs fix)
- `pharmacology_categories` - ❌ 99.9% unstandardized (ignore)

### Working Functions
1. `find_drugs_hierarchical(search_term)` ⭐ **Use this for ingredient search**
2. `find_drugs_advanced_search(...)` - Multi-criteria
3. `find_drugs_by_therapeutic_category(category)`
4. `find_drugs_by_atc_code(code)`
5. `find_drugs_by_indication(indication)`

### Broken Functions (Don't Use)
- `find_drugs_by_ingredient_grouped()` - SQL error
- `find_drugs_by_ingredient_fast()` - Returns empty
- `find_drugs_by_ingredient_v2()` - Wrapper for broken function
- `find_drugs_fast()` - References non-existent table

---

## 📈 Database Statistics

| Metric | Value | Notes |
|--------|-------|-------|
| Total drugs | 24,515 | Main table |
| Searchable drugs | 20,609 (84%) | With parsed ingredients |
| Unsearchable drugs | 3,906 (16%) | No ingredient data |
| Search table rows | 46,890 | Multiple rows per drug |
| Dosage forms | 53 | All standardized |
| Routes | 15 | All standardized |
| Therapeutic categories | 86 | Curated with clinical data |
| Ingredient groups | Unknown | Check locally |
| Ingredient standards | Unknown | Check locally |

---

## ✅ Pre-Deployment Checklist

### Database
- [ ] Backup created successfully
- [ ] Local database restored
- [ ] Route linking function created
- [ ] Route linking executed (verify 97% coverage)
- [ ] All 5 working functions tested

### Code
- [ ] Entities created (DosageForm, Route)
- [ ] DTOs created (SearchIngredientDto, AdvancedSearchDto)
- [ ] Service methods implemented
- [ ] Controller endpoints added
- [ ] Module updated with new entities

### Testing
- [ ] Ingredient search works
- [ ] Dosage form filter works (99.96% coverage)
- [ ] Route filter works (97% coverage after fix)
- [ ] Therapeutic search works
- [ ] ATC search works
- [ ] Indication search works
- [ ] Advanced search works
- [ ] Filters endpoint returns data

### Documentation
- [ ] API docs updated (Swagger)
- [ ] README updated
- [ ] Postman collection created

---

## 🐛 Known Issues & Solutions

### Issue 1: Route Coverage Only 39%
**Cause:** Compound route values like `oral.solid`
**Solution:** Run `link_drugs_to_routes_enhanced()` function
**Expected:** 97% coverage

### Issue 2: 3,906 Drugs Not Searchable
**Cause:** No parsed ingredients in `drug_ingredient_search_v2`
**Impact:** Won't appear in any ingredient searches
**Solution:** Investigate why ingredients weren't parsed (may be non-drug items)

### Issue 3: Pharmacology Categories Unusable
**Cause:** 99.9% unstandardized (5,346 unique raw values)
**Impact:** Can't filter by pharmacology class
**Solution:** Either massive standardization effort OR ignore and use therapeutic_categories

---

## 📞 Next Steps

1. **Wait for backup to complete** (check `e:/meditory-api/backups/`)
2. **Restore locally** and verify data
3. **Run route fix** to get 97% coverage
4. **Implement API endpoints** using provided code
5. **Test thoroughly** with example queries
6. **Deploy** to production after local verification

---

## 🎉 Expected Results

After implementation:
- ✅ Search 20,609 drugs by ingredient name
- ✅ Filter by 53 dosage forms (99.96% coverage)
- ✅ Filter by 15 routes (97% coverage after fix)
- ✅ Search by 86 therapeutic categories
- ✅ Search by ATC codes
- ✅ Search by medical indications
- ✅ Combine multiple criteria in advanced search
- ✅ Get all available filters dynamically

**Search speed: <300ms for complex queries**
**Database: Optimized with proper indexes**
**Coverage: 99%+ for all searchable drugs**

---

For detailed code examples and implementation steps, see:
- [search-implementation-plan.md](./search-implementation-plan.md)
