/**
 * Sanitizes and transforms user search terms for SQL LIKE queries
 * Translates user-friendly wildcards to SQL wildcards and escapes dangerous characters
 *
 * Wildcard translation:
 * - * → % (match zero or more characters)
 * - ? → _ (match exactly one character)
 *
 * Escaping:
 * - Literal % and _ in user input are escaped to prevent unintended matches
 *
 * @param searchTerm - Raw user input
 * @param autoWrap - If true, wraps term with % for contains search (default: true)
 * @returns Sanitized SQL LIKE pattern
 *
 * @example
 * sanitizeSearchTerm('para*')        → 'para%'
 * sanitizeSearchTerm('para?ol')      → 'para_ol'
 * sanitizeSearchTerm('paracetamol')  → '%paracetamol%'
 * sanitizeSearchTerm('100%', false)  → '100\\%'
 */
export function sanitizeSearchTerm(
  searchTerm: string,
  autoWrap: boolean = true,
): string {
  if (!searchTerm || searchTerm.trim() === '') {
    return '%'; // Match all if empty
  }

  let sanitized = searchTerm.trim();

  // Step 1: Escape literal SQL wildcards (% and _) that user wants to search for
  // We'll temporarily replace them with placeholders to preserve them
  sanitized = sanitized.replace(/%/g, '\\%'); // Escape %
  sanitized = sanitized.replace(/_/g, '\\_'); // Escape _

  // Step 2: Replace user-friendly wildcards with SQL wildcards
  sanitized = sanitized.replace(/\*/g, '%'); // * → %
  sanitized = sanitized.replace(/\?/g, '_'); // ? → _

  // Step 3: Auto-wrap with % for "contains" search if no wildcards present
  if (autoWrap && !sanitized.includes('%') && !sanitized.includes('_')) {
    sanitized = `%${sanitized}%`;
  }

  return sanitized;
}

/**
 * Determines if user provided explicit wildcards
 */
export function hasWildcards(searchTerm: string): boolean {
  return searchTerm.includes('*') || searchTerm.includes('?');
}
