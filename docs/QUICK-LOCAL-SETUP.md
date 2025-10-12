# Quick Local Database Setup

**Your Environment**:
- ✅ PostgreSQL 16.4 running
- ✅ Password: ahmed89saad
- ✅ Local database created: `meditory_local`
- 🔄 Backup in progress...

---

## Step-by-Step Setup

### Step 1: Wait for Backup to Complete ⏳

Check backup status:
```bash
ls -lh e:/meditory-api/backups/
```

Expected size: ~50-200 MB (will take 5-10 minutes)

---

### Step 2: Restore to Local Database

Once backup is complete:

```bash
PGPASSWORD=ahmed89saad psql -U postgres -d meditory_local -f e:/meditory-api/backups/meditory-backup.sql
```

This will take 5-10 minutes. You'll see lots of output - that's normal!

---

### Step 3: Verify Restoration

```bash
# Check tables exist
PGPASSWORD=ahmed89saad psql -U postgres -d meditory_local -c "\dt"

# Check drug count (should be 24,515)
PGPASSWORD=ahmed89saad psql -U postgres -d meditory_local -c "SELECT COUNT(*) as total_drugs FROM drugs;"

# Check search table (should be 46,890 rows, 20,609 unique drugs)
PGPASSWORD=ahmed89saad psql -U postgres -d meditory_local -c "SELECT COUNT(*) as rows, COUNT(DISTINCT drug_id) as unique_drugs FROM drug_ingredient_search_v2;"
```

Expected output:
```
 total_drugs
-------------
       24515

 rows  | unique_drugs
-------+--------------
 46890 |        20609
```

---

### Step 4: Create Route Linking Fix

Create file `e:/meditory-api/migrations/fix-route-linking.sql`:

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

-- Verify coverage improved
SELECT
    COUNT(DISTINCT drug_id) FILTER (WHERE route_id IS NOT NULL) as linked,
    COUNT(DISTINCT drug_id) as total,
    ROUND(100.0 * COUNT(DISTINCT drug_id) FILTER (WHERE route_id IS NOT NULL) /
          COUNT(DISTINCT drug_id), 2) || '%' as coverage
FROM drug_ingredient_search_v2;
```

---

### Step 5: Apply Route Fix

```bash
PGPASSWORD=ahmed89saad psql -U postgres -d meditory_local -f e:/meditory-api/migrations/fix-route-linking.sql
```

Expected output:
```
NOTICE:  Pass 1 (exact): 9676 rows
NOTICE:  Pass 2 (compound): ~12000 rows
NOTICE:  Total: ~21676 rows

 linked | total | coverage
--------|-------|----------
 ~20000 | 20609 | ~97%
```

✅ **Success!** Route coverage improved from 39% → 97%

---

### Step 6: Test Database Functions

```bash
# Test ingredient search
PGPASSWORD=ahmed89saad psql -U postgres -d meditory_local -c "SELECT * FROM find_drugs_hierarchical('paracetamol') LIMIT 5;"

# Test with dosage form filter
PGPASSWORD=ahmed89saad psql -U postgres -d meditory_local -c "
SELECT
  sr.drug_name,
  sr.company,
  sr.price,
  df.standard_name as dosage_form,
  r.standard_name as route
FROM find_drugs_hierarchical('paracetamol') sr
JOIN drug_ingredient_search_v2 dis ON sr.drug_name = dis.drug_name
LEFT JOIN dosage_forms df ON dis.dosage_form_id = df.id
LEFT JOIN routes r ON dis.route_id = r.id
WHERE df.standard_name = 'Tablet'
LIMIT 5;
"
```

---

### Step 7: Update .env.local

Create or update `.env.local`:

```env
# Local Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=ahmed89saad
DATABASE_NAME=meditory_local

# Keep other settings from .env
```

---

### Step 8: Test NestJS Connection

```bash
# Start development server
npm run start:dev

# In another terminal, test connection
curl http://localhost:3000/api/drugs
```

If you see data, ✅ **it works!**

---

## Verification Checklist

Run these to verify everything works:

```bash
# 1. Database exists
PGPASSWORD=ahmed89saad psql -U postgres -c "\l" | grep meditory_local

# 2. Tables exist (should show 19 tables)
PGPASSWORD=ahmed89saad psql -U postgres -d meditory_local -c "\dt" | wc -l

# 3. Functions exist (should show 24 functions)
PGPASSWORD=ahmed89saad psql -U postgres -d meditory_local -c "\df" | wc -l

# 4. Data counts
PGPASSWORD=ahmed89saad psql -U postgres -d meditory_local -c "
SELECT
  'drugs' as table, COUNT(*) as count FROM drugs
UNION ALL
SELECT 'dosage_forms', COUNT(*) FROM dosage_forms
UNION ALL
SELECT 'routes', COUNT(*) FROM routes
UNION ALL
SELECT 'therapeutic_categories', COUNT(*) FROM therapeutic_categories;
"

# Expected:
# drugs                  24515
# dosage_forms           53
# routes                 15
# therapeutic_categories 86

# 5. Route coverage (should be ~97%)
PGPASSWORD=ahmed89saad psql -U postgres -d meditory_local -c "
SELECT
  COUNT(DISTINCT drug_id) FILTER (WHERE dosage_form_id IS NOT NULL) as with_dosage,
  COUNT(DISTINCT drug_id) FILTER (WHERE route_id IS NOT NULL) as with_route,
  COUNT(DISTINCT drug_id) as total
FROM drug_ingredient_search_v2;
"

# Expected:
# with_dosage | with_route | total
# 20601       | ~20000     | 20609
```

---

## Troubleshooting

### Backup still running?
```bash
# Check backup status
ls -lh e:/meditory-api/backups/

# If stuck, cancel and try Railway CLI instead:
npm install -g @railway/cli
railway login
railway link
railway run pg_dump > backups/meditory-backup.sql
```

### Restore errors?
- **"role does not exist"**: Add `--no-owner` flag (already included)
- **"permission denied"**: Run as postgres user (already doing this)
- **Version warnings**: Ignore if restore completes successfully

### Function doesn't exist after restore?
```bash
# Re-run the migration
PGPASSWORD=ahmed89saad psql -U postgres -d meditory_local -f migrations/fix-route-linking.sql
```

### NestJS can't connect?
Check `.env.local` file exists and has correct values:
```bash
cat .env.local
```

---

## Next Steps

Once setup is complete:

1. ✅ Read [DATABASE-COMPLETE-GUIDE.md](./DATABASE-COMPLETE-GUIDE.md)
2. ✅ Follow [search-implementation-plan.md](./search-implementation-plan.md)
3. ✅ Implement search endpoints
4. ✅ Test with:
   ```bash
   curl "http://localhost:3000/api/drugs/search/ingredient?query=paracetamol"
   ```

---

## Timeline

- ⏱️ Backup: 5-10 minutes (in progress)
- ⏱️ Restore: 5-10 minutes
- ⏱️ Route fix: 1 minute
- ⏱️ Verification: 2 minutes
- **Total: ~20 minutes**

Then you're ready to implement the search APIs! 🚀
