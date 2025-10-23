# Meditory API

Pharmacy ERP System - Backend API

## Documentation

- **[AUTH.md](AUTH.md)** - Authentication guide
- **[DATABASE-ARCHITECTURE.md](DATABASE-ARCHITECTURE.md)** - Database schema

## Tech Stack

- **Framework:** NestJS
- **Database:** PostgreSQL
- **ORM:** TypeORM
- **Authentication:** Session-based with bcrypt
- **Caching:** In-memory LRU
- **Language:** TypeScript

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run migrations
npm run migration:run

# Start server
npm run start:dev
```

## API Documentation

Swagger UI: http://localhost:3000/api

## Testing

```bash
# E2E tests
npm run test:e2e

# Unit tests
npm test
```

## Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/meditory
SESSION_SECRET=your-strong-secret-minimum-32-characters
BCRYPT_SALT_ROUNDS=12
```
