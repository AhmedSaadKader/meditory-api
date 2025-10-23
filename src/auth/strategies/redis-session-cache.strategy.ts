import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { SessionCacheStrategy } from './session-cache-strategy.interface';
import { CachedSession } from '../services/session.service';

/**
 * Redis session cache strategy (Vendure pattern)
 * Required for multi-server deployments
 *
 * Install: npm install ioredis @types/ioredis
 */
@Injectable()
export class RedisSessionCacheStrategy
  implements SessionCacheStrategy, OnModuleDestroy
{
  private client: any; // Redis client (require('ioredis'))
  private readonly ttl: number;

  constructor(options?: { host?: string; port?: number; ttl?: number }) {
    // Dynamically import ioredis to avoid hard dependency
    const Redis = require('ioredis');
    this.client = new Redis({
      host: options?.host || process.env.REDIS_HOST || 'localhost',
      port: options?.port || parseInt(process.env.REDIS_PORT || '6379'),
      // Add auth if needed:
      // password: process.env.REDIS_PASSWORD,
    });

    // TTL in seconds (default: 5 minutes cache, like Vendure)
    this.ttl = options?.ttl || 300;
  }

  async get(sessionToken: string): Promise<CachedSession | undefined> {
    const key = this.makeKey(sessionToken);
    const data = await this.client.get(key);

    if (!data) {
      return undefined;
    }

    try {
      const session = JSON.parse(data);
      // Deserialize dates
      session.expiresAt = new Date(session.expiresAt);
      return session;
    } catch (error) {
      console.error('Failed to parse cached session:', error);
      return undefined;
    }
  }

  async set(session: CachedSession): Promise<void> {
    const key = this.makeKey(session.token);
    const data = JSON.stringify(session);

    // Set with TTL
    await this.client.setex(key, this.ttl, data);
  }

  async delete(sessionToken: string): Promise<void> {
    const key = this.makeKey(sessionToken);
    await this.client.del(key);
  }

  async clear(): Promise<void> {
    // Clear all session keys (use with caution!)
    const keys = await this.client.keys('session:*');
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  private makeKey(sessionToken: string): string {
    return `session:${sessionToken}`;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
