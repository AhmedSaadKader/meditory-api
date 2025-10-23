import { CachedSession } from '../services/session.service';

/**
 * Session cache strategy interface (Vendure pattern)
 * Allows swapping between in-memory, Redis, etc.
 */
export interface SessionCacheStrategy {
  /**
   * Get a cached session by token
   */
  get(sessionToken: string): Promise<CachedSession | undefined>;

  /**
   * Set a session in cache
   */
  set(session: CachedSession): Promise<void>;

  /**
   * Delete a session from cache
   */
  delete(sessionToken: string): Promise<void>;

  /**
   * Clear all cached sessions
   */
  clear(): Promise<void>;
}
