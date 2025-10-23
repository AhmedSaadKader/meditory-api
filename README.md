# Meditory API

Pharmacy ERP System - Backend API

---

## 📚 Documentation

### Start Here
- **[AUTH_GUIDE.md](AUTH_GUIDE.md)** ⭐ - Complete authentication guide (current state + next steps)
- **[DATABASE-ARCHITECTURE.md](DATABASE-ARCHITECTURE.md)** - Database schema and design

### Testing Resources (When Ready to Implement Tests)
- **[TESTING_ANALYSIS_SUMMARY.md](TESTING_ANALYSIS_SUMMARY.md)** - Testing overview (10 min read)
- **[AUTH_TESTING_CHECKLIST.md](AUTH_TESTING_CHECKLIST.md)** - Week-by-week implementation plan
- **[VENDURE_AUTH_TESTING_ANALYSIS.md](VENDURE_AUTH_TESTING_ANALYSIS.md)** - Deep dive (60 min read)
- **[VENDURE_TESTING_QUICK_GUIDE.md](VENDURE_TESTING_QUICK_GUIDE.md)** - Quick reference
- **`test-templates/`** - Ready-to-use test code

### Reference Documentation
- **[VENDURE_AUTH_COMPARISON.md](VENDURE_AUTH_COMPARISON.md)** - Vendure vs our implementation
- **[VENDURE_AUTH_IMPLEMENTATION_GUIDE.md](VENDURE_AUTH_IMPLEMENTATION_GUIDE.md)** - Full Vendure patterns
- **[VENDURE_FEATURES_IMPLEMENTED.md](VENDURE_FEATURES_IMPLEMENTED.md)** - What we built
- **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** - Index of all documentation

---

## Description

Pharmacy ERP backend API built with NestJS, following Vendure's battle-tested authentication patterns.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/meditory

# Authentication
SESSION_SECRET=your-strong-secret-minimum-32-characters
BCRYPT_SALT_ROUNDS=12

# Optional - Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 📋 Current Status

### Implemented ✅
- User registration with email verification
- Login/logout (session-based)
- Password reset flow
- Session management with auto-extension
- Role-based access control (RBAC)
- LRU session caching
- Redis-ready architecture

### In Progress 🟡
- E2E test suite (templates ready)
- Email service integration

### Planned 📅
- Admin panel
- Rate limiting
- 2FA (optional)

---

## 🔌 API Endpoints

### Authentication
```
POST   /auth/register                # Register new user
POST   /auth/login                   # Login
POST   /auth/logout                  # Logout
GET    /auth/me                      # Get current user
POST   /auth/verify-email            # Verify email
POST   /auth/request-password-reset  # Request password reset
POST   /auth/reset-password          # Reset password
```

### Users
```
GET    /users                        # List users
GET    /users/:id                    # Get user
PATCH  /users/:id                    # Update user
DELETE /users/:id                    # Delete user
```

---

## 🧪 Testing

### Setup Tests (First Time)

```bash
# Install test dependencies
npm install --save-dev @nestjs/testing supertest @faker-js/faker

# Copy test templates
mkdir -p test/auth test/utils test/mocks
cp test-templates/auth.e2e-spec.template.ts test/auth/auth.e2e-spec.ts
cp test-templates/error-guards.template.ts test/utils/error-guards.ts
cp test-templates/email.service.mock.template.ts test/mocks/email.service.mock.ts
cp test-templates/test-helpers.template.ts test/utils/test-helpers.ts

# Update imports in copied files, then run
npm run test:e2e
```

### Run Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

---

## 🛠️ Tech Stack

- **Framework:** NestJS
- **Database:** PostgreSQL
- **ORM:** TypeORM
- **Authentication:** Session-based with bcrypt
- **Caching:** In-memory LRU / Redis (optional)
- **Testing:** Jest / Vitest
- **Language:** TypeScript

---

## 🔒 Security

This application implements security best practices:

- ✅ Bcrypt password hashing (12 rounds)
- ✅ Session-based authentication
- ✅ Email enumeration protection
- ✅ CSRF protection
- ✅ SQL injection prevention
- ✅ Secure password reset flow
- ✅ One-time use tokens
- ✅ Auto session invalidation on password change

---

## 📖 Development

For detailed guides, see:
- [AUTH_GUIDE.md](AUTH_GUIDE.md) - Authentication implementation
- [DATABASE-ARCHITECTURE.md](DATABASE-ARCHITECTURE.md) - Database schema
- Testing docs - E2E test implementation

---

**Built with Vendure-inspired patterns for production-ready authentication.**
