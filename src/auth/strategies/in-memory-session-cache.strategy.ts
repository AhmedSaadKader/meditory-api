import { Injectable } from '@nestjs/common';
import { SessionCacheStrategy } from './session-cache-strategy.interface';
import { CachedSession } from '../services/session.service';

/**
 * In-memory session cache with LRU eviction (Vendure pattern)
 * Good for single-server deployments
 */
@Injectable()
export class InMemorySessionCacheStrategy implements SessionCacheStrategy {
  private cache: Map<string, CachedSession> = new Map();
  private readonly maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  async get(sessionToken: string): Promise<CachedSession | undefined> {
    const session = this.cache.get(sessionToken);

    if (session) {
      // LRU: Move to end (most recently used)
      this.cache.delete(sessionToken);
      this.cache.set(sessionToken, session);
    }

    return session;
  }

  async set(session: CachedSession): Promise<void> {
    // Evict oldest if at capacity (LRU)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(session.token, session);
  }

  async delete(sessionToken: string): Promise<void> {
    this.cache.delete(sessionToken);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Get current cache size (for monitoring)
   */
  size(): number {
    return this.cache.size;
  }
}
