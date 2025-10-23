# Authentication

## Overview
Session-based authentication with email/password, role-based access control (RBAC), and Vendure-inspired patterns.

## Features
- User registration with email verification
- Login/logout with session management
- Password reset flow
- Role-based permissions
- Session caching (in-memory with LRU eviction)
- Security: bcrypt hashing, email enumeration protection, CSRF protection

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/logout` - Logout current session
- `GET /auth/me` - Get current user
- `GET /auth/verify?token=xxx` - Verify email
- `POST /auth/resend-verification` - Resend verification email
- `POST /auth/request-password-reset` - Request password reset
- `POST /auth/reset-password` - Reset password with token

### User Management
- `GET /users` - List all users (requires ReadUser permission)
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user (requires CreateUser permission)
- `PATCH /users/:id` - Update user (requires UpdateUser permission)
- `DELETE /users/:id` - Delete user (requires DeleteUser permission)
- `POST /users/:id/roles` - Assign role (requires ManageRoles permission)
- `DELETE /users/:id/roles/:roleId` - Remove role (requires ManageRoles permission)

## Default Roles
- `pharmacist` - Pharmacist role
- `admin` - Administrator role (has SuperAdmin permission for testing)
- `technician` - Technician role

## Configuration
- Session expiry: 30 days
- Token expiry: 24 hours
- Password hash rounds: 12
- Session cache: In-memory LRU (max 10,000 sessions)

## Testing
- E2E tests: `npm run test:e2e`
- Unit tests: `npm test`
- See `test/auth/auth.e2e-spec.ts` for examples

## Documentation
- Swagger UI: http://localhost:3000/api
