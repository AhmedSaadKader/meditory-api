-- Create advanced search function with separate drug_name and ingredient filters
-- Allows searching by drug name AND/OR active ingredient simultaneously
-- Supports wildcards: % (zero or more chars) and _ (exactly one char)

CREATE OR REPLACE FUNCTION find_drugs_advanced(
    drug_name_filter text DEFAULT NULL,
    ingredient_filter text DEFAULT NULL
)
RETURNS TABLE(
    drug_name text,
    company text,
    price numeric,
    group_name text,
    standard_term text,
    match_type text,
    priority integer
)
LANGUAGE plpgsql
AS $function$
BEGIN
    -- If both filters are null, return empty
    IF drug_name_filter IS NULL AND ingredient_filter IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH ingredient_matches AS (
        -- If ingredient filter is provided, find matching ingredients
        SELECT DISTINCT
            dis.drug_name as dn,
            dis.standard_term as st,
            'direct_ingredient' as match_type,
            1 as priority
        FROM drug_ingredient_search_v2 dis
        WHERE ingredient_filter IS NOT NULL
          AND (
              LOWER(dis.group_name) LIKE LOWER(ingredient_filter)
              OR LOWER(dis.standard_term) LIKE LOWER(ingredient_filter)
          )

        UNION

        -- Synonym-based ingredient search
        SELECT DISTINCT
            dis.drug_name as dn,
            dis.standard_term as st,
            'synonym' as match_type,
            2 as priority
        FROM ingredient_synonyms syn
        JOIN drug_ingredient_search_v2 dis ON syn.standard_id = dis.standard_id
        WHERE ingredient_filter IS NOT NULL
          AND LOWER(syn.synonym_text) LIKE LOWER(ingredient_filter)

        UNION

        -- Group-based ingredient search
        SELECT DISTINCT
            dis.drug_name as dn,
            dis.standard_term as st,
            'group_match' as match_type,
            3 as priority
        FROM ingredient_synonyms syn
        JOIN ingredient_standards ist ON syn.standard_id = ist.standard_id
        JOIN drug_ingredient_search_v2 dis ON ist.group_id = dis.group_id
        WHERE ingredient_filter IS NOT NULL
          AND LOWER(syn.synonym_text) LIKE LOWER(ingredient_filter)
          AND ist.group_id IS NOT NULL
    )
    SELECT DISTINCT
        dis.drug_name,
        dis.company,
        dis.price,
        dis.group_name,
        dis.standard_term,
        COALESCE(im.match_type, 'drug_name') as match_type,
        COALESCE(im.priority, 99) as priority
    FROM drug_ingredient_search_v2 dis
    LEFT JOIN ingredient_matches im
        ON dis.drug_name = im.dn
        AND dis.standard_term = im.st
    WHERE (
        -- Drug name filter (if provided)
        (drug_name_filter IS NULL OR LOWER(dis.drug_name) LIKE LOWER(drug_name_filter))
        AND
        -- Ingredient filter (if provided, must match ingredient_matches)
        (ingredient_filter IS NULL OR im.dn IS NOT NULL)
    )
    ORDER BY
        COALESCE(im.priority, 99),
        dis.drug_name;
END;
$function$;

COMMENT ON FUNCTION find_drugs_advanced(text, text) IS
'Advanced search with separate drug name and ingredient filters.
Both filters support SQL wildcards (% and _).
Can filter by drug name only, ingredient only, or both together.';
