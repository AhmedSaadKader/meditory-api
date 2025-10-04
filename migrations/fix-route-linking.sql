-- Fix Route Linking: Handle Compound Routes (oral.solid, oral.liquid)
-- This enhances the route linking to support compound route values
-- Expected improvement: 39% → 97% coverage

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
    COUNT(DISTINCT drug_id) FILTER (WHERE route_id IS NOT NULL) as linked_drugs,
    COUNT(DISTINCT drug_id) as total_drugs,
    ROUND(100.0 * COUNT(DISTINCT drug_id) FILTER (WHERE route_id IS NOT NULL) /
          COUNT(DISTINCT drug_id), 2) || '%' as coverage_percentage
FROM drug_ingredient_search_v2;
