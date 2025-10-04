# Drug Classification Linking Accuracy Report

**Date**: 2025-10-02
**Analysis**: Comparison of raw drug data vs. linked standardized classifications

---

## Executive Summary

**Key Discovery**: The `drug_ingredient_search_v2` table has **multiple rows per drug** (one row per ingredient combination), so we must count **distinct drugs**, not total rows.

### Database Structure
- **Total drugs in system**: 24,515 drugs
- **Drugs with parsed ingredients**: 20,609 drugs (84%)
- **Drugs missing from search**: 3,906 drugs (16%) - no ingredient data

### Current Linking Status

| Classification | Drugs Linked | Coverage (of searchable drugs) | Coverage (of all drugs) |
|----------------|--------------|-------------------------------|------------------------|
| **Dosage Forms** | 20,601 / 20,609 | **99.96%** ✅ | 84% |
| **Routes** | 8,032 / 20,609 | **39%** ⚠️ | 33% |

---

## 🔍 Dosage Forms Analysis

### Current Status
- Total drugs: **24,515**
- Drugs with dosage_form data: **24,497** (99.9%)
- **Searchable** drugs (in `drug_ingredient_search_v2`): **20,609**
- **Linked** drugs (with `dosage_form_id`): **20,601**
- **Coverage**: 99.96% of searchable drugs ✅

### Assessment
✅ **EXCELLENT** - Dosage form linking is nearly perfect for all searchable drugs.

**Why 8 drugs aren't linked**:
- Likely have unusual/typo dosage form values
- Or dosage_form is NULL/empty

**Why 3,906 drugs total aren't searchable**:
- No ingredients parsed in `drug_ingredient_search_v2`
- Cannot be found by ingredient searches regardless of dosage form linking

### Top Dosage Forms

| Dosage Form | Total in DB | Standard Name | Pharmaceutical Category |
|-------------|-------------|---------------|------------------------|
| tablet | ~12,354 | Tablet | Solid Dosage Forms |
| cream | ~7,616 | Cream | Topical Preparations |
| capsule | ~4,828 | Capsule | Solid Dosage Forms |
| piece | ~3,493 | Piece | - |
| sachet | ~3,242 | Sachet | - |
| syrup | ~2,620 | Syrup | Liquid Preparations |
| gel | ~2,597 | Gel | - |
| lotion | ~1,884 | Lotion | - |

**Conclusion**: ✅ **Dosage form linking works perfectly**. All 53 standardized forms are properly mapped and 99.96% of searchable drugs are linked.

---

## 🔍 Routes Analysis

### Current Status
- Total drugs: **24,515**
- Drugs with route data: **24,271** (99%)
- **Searchable** drugs (in `drug_ingredient_search_v2`): **20,609**
- **Linked** drugs (with `route_id`): **8,032**
- **Coverage**: Only 39% of searchable drugs ⚠️
- **Missing**: **12,577 drugs** (61%)

### Assessment
⚠️ **POOR** - Most drugs cannot be filtered by route despite having route data.

### Problem: Compound Route Values

The `drugs.route` field contains **compound values** that don't match the standardized single-route entries in the `routes` table.

| Raw Route (in drugs) | Drugs | Linked? | Issue |
|---------------------|-------|---------|-------|
| **oral.solid** | 17,750 | ❌ No | Compound value (route + dosage form) |
| **oral.liquid** | 4,111 | ❌ No | Compound value (route + dosage form) |
| topical | 15,418 | ✅ Yes | Simple match → "Topical" |
| injection | 3,363 | ✅ Yes | Mapped to "Parenteral" |
| eff | 2,918 | ✅ Yes | Mapped to "Oral" |
| **unknown** | 2,092 | ❌ No | Invalid/placeholder value |
| spray | 1,662 | ✅ Yes | Mapped to "Topical Spray" |
| vaginal | 809 | ✅ Yes | Simple match |
| eye | 740 | ✅ Yes | Mapped to "Ophthalmic" |
| mouth | 556 | ✅ Yes | Mapped to "Oral" |
| ear | 74 | ✅ Yes | Mapped to "Otic" |

### Root Cause Analysis

#### The routes table has 15 standardized entries:
```
oral, topical, im, iv, ear, eff, eye, inhalation, injection,
mouth, nose, rectal, soap, spray, vaginal
```

#### But drugs.route contains compound routes:
- `oral.solid` - **17,750 drugs** ❌
- `oral.liquid` - **4,111 drugs** ❌
- Total affected: **21,861 drugs** (89% of all drugs!)

These compound routes **combine route + dosage form** (e.g., "oral" + "solid"), which:
1. Doesn't exist in the `routes` table
2. Is redundant (dosage form is already a separate field)
3. Prevents proper linking

---

## 💡 The Solution: Enhanced Route Linking

### Proposed Function

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

    -- Pass 2: Compound route handling (e.g., "oral.solid" → "oral")
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

    RAISE NOTICE 'Pass 1 (exact matches): % drugs', pass1_count;
    RAISE NOTICE 'Pass 2 (compound routes): % drugs', pass2_count;
    RAISE NOTICE 'Total updated: % drugs', updated_count;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
```

### Expected Impact

| Metric | Before | After Enhancement |
|--------|--------|-------------------|
| Routes linked | 8,032 (39%) | ~20,000 (97%) ✅ |
| Searchable by route | 8,032 drugs | ~20,000 drugs |
| Improvement | - | +12,000 drugs |

---

## 📊 Detailed Analysis

### Why `drug_ingredient_search_v2` has 46,890 rows but only 20,609 drugs

The table is **denormalized** with one row per drug-ingredient combination:

**Example**: Drug "Panadol Extra" with 2 ingredients (Paracetamol + Caffeine)
- **Rows in search table**: 2 (one per ingredient)
- **Unique drug**: 1

This is **correct design** for ingredient searching but means we must use `COUNT(DISTINCT drug_id)` for drug statistics.

### Why 3,906 drugs aren't in the search table

These drugs have:
1. No `active_raw` data (no ingredient text)
2. No parsed ingredients in `active_combinations`
3. Cannot be found by ingredient searches
4. Will never appear in results from `find_drugs_hierarchical()` or other ingredient functions

**These drugs are effectively unsearchable by ingredient** regardless of classification linking.

---

## 🎯 Recommendations

### Immediate (Critical) ⚠️

1. **Implement Enhanced Route Linking Function**
   - Will link 12,000+ additional drugs
   - Increases route coverage from 39% → 97%

2. **Run the Enhanced Function**
   ```sql
   SELECT link_drugs_to_routes_enhanced();
   ```

3. **Verify Results**
   ```sql
   SELECT
       COUNT(DISTINCT drug_id) FILTER (WHERE route_id IS NOT NULL) as linked,
       COUNT(DISTINCT drug_id) as total,
       ROUND(100.0 * COUNT(DISTINCT drug_id) FILTER (WHERE route_id IS NOT NULL) / COUNT(DISTINCT drug_id), 2) as pct
   FROM drug_ingredient_search_v2;
   ```

### Short-term (Important)

1. **Handle "unknown" Routes**
   - 2,092 drugs have `route = 'unknown'`
   - Should be `NULL` or reviewed manually

2. **Add Missing Routes to Table**
   - Check for any unrecognized route values
   - Add to `routes` table with proper standardization

### Long-term (Data Quality)

1. **Clean ETL Pipeline**
   - Stop storing compound routes like `oral.solid`
   - Store only: `oral`, `topical`, `injection`, etc.
   - Dosage form is already captured separately

2. **Investigate Missing 3,906 Drugs**
   - Why do they have no ingredients parsed?
   - Are they cosmetics, medical devices, or supplements?
   - Should they be excluded from drug searches?

3. **Add Data Quality Monitoring**
   - Alert when new unrecognized routes appear
   - Track linking coverage over time
   - Flag drugs with empty/null critical fields

---

## 📈 Coverage Statistics

### Current State (After Dosage Linking, Before Route Fix)

| Metric | Value | % of Searchable | % of All Drugs |
|--------|-------|-----------------|----------------|
| Total drugs in system | 24,515 | - | 100% |
| Searchable drugs | 20,609 | 100% | 84% |
| With dosage form linked | 20,601 | **99.96%** ✅ | 84% |
| With route linked | 8,032 | **39%** ⚠️ | 33% |

### Expected After Route Enhancement

| Metric | Value | % of Searchable | % of All Drugs |
|--------|-------|-----------------|----------------|
| Total drugs in system | 24,515 | - | 100% |
| Searchable drugs | 20,609 | 100% | 84% |
| With dosage form linked | 20,601 | **99.96%** ✅ | 84% |
| With route linked | ~20,000 | **~97%** ✅ | 82% |

---

## ✅ Conclusions

1. **Dosage form linking is excellent** (99.96% coverage) ✅
2. **Route linking is broken** (39% coverage) but fixable ⚠️
3. **The fix is simple**: handle compound routes by splitting on `.`
4. **Expected improvement**: +12,000 drugs (39% → 97% coverage)
5. **Root cause**: ETL pipeline stores redundant compound values
6. **3,906 drugs are unsearchable** due to missing ingredient data (separate issue)

---

## 🔧 Action Items

### Priority 1 (Critical)
- [ ] Create `link_drugs_to_routes_enhanced()` function
- [ ] Run enhanced linking
- [ ] Verify 97% coverage achieved

### Priority 2 (Important)
- [ ] Handle "unknown" route values
- [ ] Update `database-function-analysis.md` with accurate coverage
- [ ] Document findings for data team

### Priority 3 (Long-term)
- [ ] Clean ETL to stop storing compound routes
- [ ] Investigate 3,906 unsearchable drugs
- [ ] Set up data quality monitoring
