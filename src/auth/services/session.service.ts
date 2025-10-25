import { Injectable, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';
import type { SessionCacheStrategy } from '../strategies/session-cache-strategy.interface';
import * as crypto from 'crypto';

export interface CachedSession {
  sessionId: number;
  token: string;
  expiresAt: Date;
  cacheExpiry: number;
  user: {
    userId: number;
    username: string;
    verified: boolean;
    permissions: string[];
  };
  authenticationStrategy: string;
}

@Injectable()
export class SessionService {
  private sessionDurationInMs = 30 * 24 * 60 * 60 * 1000; // 30 days
  private sessionCacheTTL = 300; // 5 minutes
  private cacheStrategy: SessionCacheStrategy;

  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @Optional()
    @Inject('SESSION_CACHE_STRATEGY')
    cacheStrategy?: SessionCacheStrategy,
  ) {
    // Use injected strategy or fall back to in-memory (Vendure pattern)
    if (cacheStrategy) {
      this.cacheStrategy = cacheStrategy;
    } else {
      // Fallback: create in-memory strategy
      const {
        InMemorySessionCacheStrategy,
      } = require('../strategies/in-memory-session-cache.strategy');
      this.cacheStrategy = new InMemorySessionCacheStrategy();
    }
  }

  /**
   * Create a new authenticated session after successful login
   */
  async createNewAuthenticatedSession(
    user: User,
    authenticationStrategyName: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Session> {
    const token = this.generateSessionToken();
    const expiresAt = this.getExpiryDate(this.sessionDurationInMs);

    const session = this.sessionRepository.create({
      token,
      user,
      userId: user.userId,
      authenticationStrategy: authenticationStrategyName,
      expiresAt,
      invalidatedAt: null,
      ipAddress,
      userAgent,
    });

    const savedSession = await this.sessionRepository.save(session);

    // Cache the session
    await this.cacheSession(this.serializeSession(savedSession, user));

    return savedSession;
  }

  /**
   * Get session from token (check cache first, then DB)
   * Vendure pattern: Extends session expiry if past halfway point
   */
  async getSessionFromToken(
    sessionToken: string,
  ): Promise<CachedSession | undefined> {
    // Try cache first (using strategy pattern)
    let serializedSession = await this.cacheStrategy.get(sessionToken);

    const stale =
      serializedSession && serializedSession.cacheExpiry < Date.now() / 1000;
    const expired =
      serializedSession && serializedSession.expiresAt < new Date();

    // If stale/expired/missing, hit database
    if (!serializedSession || stale || expired) {
      const session = await this.findSessionByToken(sessionToken);

      if (session) {
        serializedSession = this.serializeSession(session, session.user);
        await this.cacheSession(serializedSession);

        // Vendure pattern: Extend session if past halfway point
        await this.maybeExtendSession(session);

        return serializedSession;
      }

      return undefined;
    }

    // Check if we should extend the session (Vendure pattern)
    const now = Date.now();
    const expiresAtMs = serializedSession.expiresAt.getTime();
    const halfwayPoint = expiresAtMs - this.sessionDurationInMs / 2;

    if (now > halfwayPoint) {
      // Past halfway, extend the session
      const session = await this.sessionRepository.findOne({
        where: { token: sessionToken },
      });

      if (session) {
        await this.maybeExtendSession(session);
        // Update cached session with new expiry
        serializedSession.expiresAt = session.expiresAt;
      }
    }

    return serializedSession;
  }

  /**
   * Extend session expiry if past halfway point (Vendure pattern)
   */
  private async maybeExtendSession(session: Session): Promise<void> {
    const now = Date.now();
    const expiresAtMs = session.expiresAt.getTime();
    const halfwayPoint = expiresAtMs - this.sessionDurationInMs / 2;

    if (now > halfwayPoint) {
      // Extend session
      const newExpiry = this.getExpiryDate(this.sessionDurationInMs);
      await this.sessionRepository.update(
        { sessionId: session.sessionId },
        { expiresAt: newExpiry },
      );
      session.expiresAt = newExpiry;
    }
  }

  /**
   * Delete all sessions for a user (logout all devices)
   */
  async deleteSessionsByUser(user: User): Promise<void> {
    const sessions = await this.sessionRepository.find({
      where: { userId: user.userId },
    });

    await this.sessionRepository.remove(sessions);

    // Clear from cache (using strategy)
    for (const session of sessions) {
      await this.cacheStrategy.delete(session.token);
    }
  }

  /**
   * Invalidate a session by token (logout)
   */
  async invalidateSession(sessionToken: string): Promise<void> {
    await this.sessionRepository.update(
      { token: sessionToken },
      { invalidatedAt: new Date() },
    );

    await this.cacheStrategy.delete(sessionToken);
  }

  /**
   * Find session by token from database
   */
  private async findSessionByToken(token: string): Promise<Session | null> {
    const session = await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .leftJoinAndSelect('user.roles', 'roles')
      .where('session.token = :token', { token })
      .andWhere('session.invalidated_at IS NULL')
      .andWhere('user.deleted_at IS NULL')
      .getOne();

    if (session && session.expiresAt > new Date()) {
      return session;
    }

    return null;
  }

  /**
   * Serialize session for caching
   */
  private serializeSession(session: Session, user: User): CachedSession {
    const expiry = Date.now() / 1000 + this.sessionCacheTTL;

    // Collect all permissions from user's roles
    const permissions = new Set<string>();
    for (const role of user.roles || []) {
      for (const permission of role.permissions) {
        permissions.add(permission);
      }
    }

    return {
      cacheExpiry: expiry,
      sessionId: session.sessionId,
      token: session.token,
      expiresAt: session.expiresAt,
      authenticationStrategy: session.authenticationStrategy,
      user: {
        userId: user.userId,
        username: user.username,
        verified: user.verified,
        permissions: Array.from(permissions),
      },
    };
  }

  /**
   * Cache a session (using strategy pattern)
   */
  private async cacheSession(session: CachedSession): Promise<void> {
    await this.cacheStrategy.set(session);
  }

  /**
   * Generate a random session token
   */
  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calculate expiry date
   */
  private getExpiryDate(timeToExpireInMs: number): Date {
    return new Date(Date.now() + timeToExpireInMs);
  }
}
