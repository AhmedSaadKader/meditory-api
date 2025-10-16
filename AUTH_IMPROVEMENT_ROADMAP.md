# Authentication System - Improvement Roadmap

**Based on:** Vendure Authentication Comparison Analysis
**Date:** 2025-01-16
**Priority:** Implementation recommendations ordered by business impact

---

## Quick Summary

Your authentication system is **well-designed and secure**. You've successfully adopted Vendure's battle-tested patterns. The gaps are primarily **production readiness features** rather than fundamental design issues.

**Overall Score: 8/10**

---

## Critical Gaps (Implement This Week)

### 1. Password Reset Flow ⚠️ HIGH PRIORITY

**Status:** Missing
**Impact:** Users cannot recover accounts; requires admin intervention
**Effort:** 4-6 hours

**What to Build:**
- Request password reset endpoint (`POST /auth/request-password-reset`)
- Reset password endpoint (`POST /auth/reset-password`)
- Token generation and expiry (24 hours)
- Email service integration (stub for now)

**Files to Create/Modify:**
```
src/auth/dto/request-password-reset.dto.ts (new)
src/auth/dto/reset-password.dto.ts (new)
src/auth/services/auth.service.ts (add methods)
src/auth/controllers/auth.controller.ts (add endpoints)
src/auth/entities/native-authentication-method.entity.ts (add fields)
```

**Migration:**
```sql
ALTER TABLE operational.authentication_methods
ADD COLUMN password_reset_token VARCHAR(255),
ADD COLUMN password_reset_expiry TIMESTAMP;
```

---

### 2. Session Expiry Extension ⚠️ HIGH PRIORITY

**Status:** Missing
**Impact:** Active users get logged out after 30 days even if using system
**Effort:** 2-3 hours

**What to Build:**
- Automatic session extension when past halfway point
- Update both database and cache
- Make duration configurable

**Files to Modify:**
```
src/auth/services/session.service.ts
  - Add maybeExtendSession() private method
  - Call from findSessionByToken()
```

**Logic:**
```typescript
// If session expires in < 15 days, extend to 30 days from now
if (expiresAt - now < sessionDurationMs / 2) {
    newExpiry = now + sessionDurationMs;
    // Update DB and cache
}
```

---

### 3. Redis Session Cache Strategy ⚠️ HIGH PRIORITY

**Status:** In-memory Map (not production-ready)
**Impact:** Cannot scale to multiple instances; memory leaks
**Effort:** 6-8 hours

**What to Build:**
- `SessionCacheStrategy` interface
- `InMemorySessionCacheStrategy` with LRU eviction
- `RedisSessionCacheStrategy` for production
- Configuration via environment variable

**Files to Create:**
```
src/auth/cache/session-cache-strategy.interface.ts (new)
src/auth/cache/in-memory-session-cache.strategy.ts (new)
src/auth/cache/redis-session-cache.strategy.ts (new)
src/auth/auth.module.ts (configure provider)
```

**Dependencies:**
```bash
npm install ioredis
npm install -D @types/ioredis
```

**Environment:**
```env
REDIS_URL=redis://localhost:6379
SESSION_CACHE_STRATEGY=redis  # or 'memory'
```

---

## Important Improvements (Next Sprint)

### 4. EventBus for Audit Logging 📊 MEDIUM PRIORITY

**Why:** Pharmacy regulations require audit trails for prescriptions and user actions

**What to Build:**
- Simple EventBus with RxJS
- Event classes: `LoginEvent`, `LogoutEvent`, `PrescriptionAccessEvent`
- `AuditLoggerService` subscriber
- Persist to `audit_logs` table

**Effort:** 8-12 hours

**Benefits:**
- Regulatory compliance
- Decoupled logging
- Email notifications
- Analytics tracking

---

### 5. Bearer Token Support 🔑 MEDIUM PRIORITY

**Why:** Mobile apps and API integrations need Bearer tokens

**What to Build:**
- Configurable token method (cookie, bearer, or both)
- Response header for Bearer tokens
- Update AuthGuard to support both

**Effort:** 3-4 hours

**Config:**
```env
AUTH_TOKEN_METHOD=cookie,bearer
AUTH_TOKEN_HEADER=X-Auth-Token
```

---

### 6. Job Queue System (BullMQ) ⏰ MEDIUM PRIORITY

**Why:** Background tasks (emails, cleanup, reports) shouldn't block requests

**What to Build:**
- Bull queue setup with Redis
- Email queue + processor
- Session cleanup job (daily)
- Report generation queue

**Effort:** 8-12 hours

**Dependencies:**
```bash
npm install @nestjs/bull bull
```

---

## Additional Security Features

### 7. Rate Limiting 🛡️ MEDIUM PRIORITY

**Why:** Prevent brute-force attacks on login endpoint

**What to Build:**
```typescript
@Throttle(5, 60) // 5 attempts per 60 seconds
@Post('login')
async login() { ... }
```

**Effort:** 1-2 hours

**Dependencies:**
```bash
npm install @nestjs/throttler
```

---

### 8. Account Lockout 🔒 MEDIUM PRIORITY

**Why:** Protect accounts from brute-force attacks

**What to Build:**
- Track failed login attempts
- Lock account after 5 failures
- Auto-unlock after 15 minutes
- Email notification on lockout

**Effort:** 4-6 hours

**Fields to Add:**
```sql
ALTER TABLE operational.users
ADD COLUMN failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN locked_until TIMESTAMP;
```

---

## Future Enhancements (Low Priority)

### 9. Two-Factor Authentication (2FA)

**When:** If handling controlled substances or high-value transactions
**Effort:** 20-30 hours
**Tech:** TOTP (Google Authenticator, Authy)

---

### 10. Multi-Channel Support

**When:** Multiple pharmacy locations or franchise model
**Effort:** 40+ hours (major refactor)
**Example:** Hospital pharmacy vs. retail pharmacy with different permissions

---

### 11. Database Replication

**When:** High read volume or geographic distribution
**Effort:** 16-24 hours
**Feature:** Read replicas with `ctx.setReplicationMode('replica')`

---

## Implementation Timeline

### Week 1: Critical Fixes
- [ ] Day 1-2: Password reset flow
- [ ] Day 3: Session expiry extension
- [ ] Day 4-5: Redis cache strategy

**Deliverable:** Production-ready authentication

---

### Week 2-3: Production Hardening
- [ ] EventBus + audit logging
- [ ] Bearer token support
- [ ] Rate limiting
- [ ] Account lockout

**Deliverable:** Enterprise-ready, compliant

---

### Week 4+: Advanced Features
- [ ] Job queue (BullMQ)
- [ ] Password strength validation
- [ ] Email service integration
- [ ] Admin dashboard for user management

**Deliverable:** Full-featured authentication system

---

## Quick Wins (< 2 Hours Each)

### 1. LRU Cache Eviction

**Current:**
```typescript
private sessionCache: Map<string, CachedSession> = new Map();
```

**Improved:**
```typescript
private cache = new Map<string, CachedSession>();
private maxSize = 1000;

set(token: string, session: CachedSession) {
    if (this.cache.size >= this.maxSize) {
        const oldest = this.cache.keys().next().value;
        this.cache.delete(oldest);
    }
    this.cache.set(token, session);
}

get(token: string) {
    const session = this.cache.get(token);
    if (session) {
        // Refresh (move to end)
        this.cache.delete(token);
        this.cache.set(token, session);
    }
    return session;
}
```

---

### 2. Cache Timeout Protection

**Add to SessionService:**
```typescript
private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs = 50
): Promise<T | undefined> {
    return Promise.race([
        promise,
        new Promise<undefined>(resolve =>
            setTimeout(() => resolve(undefined), timeoutMs)
        ),
    ]);
}

// Usage
const cached = await this.withTimeout(this.cache.get(token));
if (!cached) {
    // Cache timeout, fallback to DB
    return this.findSessionByToken(token);
}
```

---

### 3. Extract Verification Token Generator

**Create utility:**
```typescript
// src/common/utils/token.utils.ts
import * as crypto from 'crypto';

export function generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

export function generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
}
```

**Use everywhere:**
```typescript
// Instead of inline crypto.randomBytes()
const token = generateVerificationToken();
```

---

## Testing Checklist

### Unit Tests to Add

- [ ] `SessionService.maybeExtendSession()`
- [ ] `SessionService` with Redis strategy
- [ ] `AuthService.requestPasswordReset()`
- [ ] `AuthService.resetPassword()`
- [ ] `AuthGuard` with Bearer tokens
- [ ] `RequestContext.userHasPermissions()`
- [ ] LRU cache eviction

### Integration Tests to Add

- [ ] Complete login flow
- [ ] Password reset flow (end-to-end)
- [ ] Session extension on activity
- [ ] Account lockout after failed attempts
- [ ] Rate limiting on login endpoint
- [ ] Cache timeout fallback to DB

### E2E Tests to Add

- [ ] Register → Verify Email → Login → Access Protected Route
- [ ] Forgot Password → Reset → Login
- [ ] Login → 30 days of activity → Session still valid
- [ ] Login from two devices → Logout all → Both invalidated

---

## Configuration Reference

### Environment Variables to Add

```env
# Session
SESSION_DURATION=30d
SESSION_CACHE_STRATEGY=redis  # or 'memory'
SESSION_CACHE_TTL=1800  # 30 minutes

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-password-here

# Auth
AUTH_TOKEN_METHOD=cookie,bearer
AUTH_TOKEN_HEADER=X-Auth-Token
REQUIRE_EMAIL_VERIFICATION=false

# Rate Limiting
RATE_LIMIT_LOGIN_ATTEMPTS=5
RATE_LIMIT_LOGIN_TTL=60
RATE_LIMIT_GLOBAL_TTL=60
RATE_LIMIT_GLOBAL_LIMIT=100

# Account Security
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=900  # 15 minutes in seconds

# Password Reset
PASSWORD_RESET_TOKEN_TTL=86400  # 24 hours in seconds

# Email (TODO)
EMAIL_SERVICE=sendgrid  # or 'smtp'
EMAIL_FROM=noreply@meditory.com
```

---

## Resources

### Vendure Documentation
- [Auth Guide](https://docs.vendure.io/guides/core-concepts/auth/)
- [Session Cache Strategy](https://docs.vendure.io/reference/typescript-api/auth/session-cache-strategy/)
- [Password Hashing Strategy](https://docs.vendure.io/reference/typescript-api/auth/password-hashing-strategy/)

### NestJS Documentation
- [Authentication](https://docs.nestjs.com/security/authentication)
- [Guards](https://docs.nestjs.com/guards)
- [Bull Queue](https://docs.nestjs.com/techniques/queues)

### Libraries
- [ioredis](https://github.com/redis/ioredis) - Redis client
- [BullMQ](https://github.com/taskforcesh/bullmq) - Job queue
- [zxcvbn](https://github.com/dropbox/zxcvbn) - Password strength
- [@nestjs/throttler](https://github.com/nestjs/throttler) - Rate limiting

---

## Questions?

For detailed implementation examples, see:
- `VENDURE_AUTH_COMPARISON.md` - Full analysis with code examples
- `AUTH_IMPLEMENTATION_SUMMARY.md` - Current implementation overview

---

## Summary: What to Do Next

1. **This week:** Implement password reset (4-6 hours)
2. **This week:** Add session extension (2-3 hours)
3. **This week:** Redis cache strategy (6-8 hours)
4. **Next sprint:** EventBus + Bearer tokens (12-15 hours)
5. **Later:** Job queue + security features (15-20 hours)

**Total effort to production-ready:** ~40-50 hours

Your authentication system is already solid. These improvements will make it enterprise-grade and fully production-ready for a pharmacy ERP system.
