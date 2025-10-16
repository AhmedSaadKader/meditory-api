import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';
import * as crypto from 'crypto';

export interface CachedSession {
  sessionId: number;
  token: string;
  expiresAt: Date;
  cacheExpiry: number;
  user: {
    userId: number;
    email: string;
    verified: boolean;
    permissions: string[];
  };
  authenticationStrategy: string;
}

@Injectable()
export class SessionService {
  private sessionDurationInMs = 30 * 24 * 60 * 60 * 1000; // 30 days
  private sessionCache: Map<string, CachedSession> = new Map();
  private sessionCacheTTL = 300; // 5 minutes

  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
  ) {}

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
   */
  async getSessionFromToken(
    sessionToken: string,
  ): Promise<CachedSession | undefined> {
    // Try cache first
    let serializedSession = this.sessionCache.get(sessionToken);

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
        return serializedSession;
      }

      return undefined;
    }

    return serializedSession;
  }

  /**
   * Delete all sessions for a user (logout all devices)
   */
  async deleteSessionsByUser(user: User): Promise<void> {
    const sessions = await this.sessionRepository.find({
      where: { userId: user.userId },
    });

    await this.sessionRepository.remove(sessions);

    // Clear from cache
    for (const session of sessions) {
      this.sessionCache.delete(session.token);
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

    this.sessionCache.delete(sessionToken);
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
        email: user.email,
        verified: user.verified,
        permissions: Array.from(permissions),
      },
    };
  }

  /**
   * Cache a session (use Redis in production)
   */
  private async cacheSession(session: CachedSession): Promise<void> {
    this.sessionCache.set(session.token, session);
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
