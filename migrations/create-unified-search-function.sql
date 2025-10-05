-- Create unified search function that searches across drug names, ingredients, synonyms, and groups
-- Supports wildcards: % (zero or more chars) and _ (exactly one char)
-- Returns prioritized results: exact match > drug name > direct ingredient > synonym > group

CREATE OR REPLACE FUNCTION find_drugs_unified(search_term text)
RETURNS TABLE(
    drug_name text,
    company text,
    price numeric,
    group_name text,
    standard_term text,
    match_type text
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH search_results AS (
        -- Priority 1: Exact drug name match (case-insensitive)
        SELECT DISTINCT
            dis.drug_name,
            dis.company,
            dis.price,
            dis.group_name,
            dis.standard_term,
            'exact_name' as match_type,
            1 as priority
        FROM drug_ingredient_search_v2 dis
        WHERE LOWER(dis.drug_name) = LOWER(search_term)

        UNION

        -- Priority 2: Drug name partial match
        SELECT DISTINCT
            dis.drug_name,
            dis.company,
            dis.price,
            dis.group_name,
            dis.standard_term,
            'drug_name' as match_type,
            2 as priority
        FROM drug_ingredient_search_v2 dis
        WHERE LOWER(dis.drug_name) LIKE LOWER(search_term)

        UNION

        -- Priority 3: Direct ingredient/group match
        SELECT DISTINCT
            dis.drug_name,
            dis.company,
            dis.price,
            dis.group_name,
            dis.standard_term,
            'direct_ingredient' as match_type,
            3 as priority
        FROM drug_ingredient_search_v2 dis
        WHERE LOWER(dis.group_name) LIKE LOWER(search_term)
           OR LOWER(dis.standard_term) LIKE LOWER(search_term)

        UNION

        -- Priority 4: Synonym-based search
        SELECT DISTINCT
            dis.drug_name,
            dis.company,
            dis.price,
            dis.group_name,
            dis.standard_term,
            'synonym' as match_type,
            4 as priority
        FROM ingredient_synonyms syn
        JOIN drug_ingredient_search_v2 dis ON syn.standard_id = dis.standard_id
        WHERE LOWER(syn.synonym_text) LIKE LOWER(search_term)

        UNION

        -- Priority 5: Group-based search (from synonyms)
        SELECT DISTINCT
            dis.drug_name,
            dis.company,
            dis.price,
            dis.group_name,
            dis.standard_term,
            'group_match' as match_type,
            5 as priority
        FROM ingredient_synonyms syn
        JOIN ingredient_standards ist ON syn.standard_id = ist.standard_id
        JOIN drug_ingredient_search_v2 dis ON ist.group_id = dis.group_id
        WHERE LOWER(syn.synonym_text) LIKE LOWER(search_term)
          AND ist.group_id IS NOT NULL
    )
    SELECT DISTINCT ON (sr.drug_name, sr.standard_term)
        sr.drug_name,
        sr.company,
        sr.price,
        sr.group_name,
        sr.standard_term,
        sr.match_type
    FROM search_results sr
    ORDER BY sr.drug_name, sr.standard_term, sr.priority, sr.match_type;
END;
$function$;

COMMENT ON FUNCTION find_drugs_unified(text) IS
'Unified search across drug names, ingredients, synonyms, and groups.
Supports SQL wildcards (% and _). Returns prioritized results.';
