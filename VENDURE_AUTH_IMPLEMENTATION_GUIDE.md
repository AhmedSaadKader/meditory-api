# Meditory API - Authentication & Authorization Implementation Guide

Complete step-by-step guide to implement Vendure-style authentication and authorization for the Meditory pharmacy ERP.

**Adapted from Vendure's battle-tested implementation, simplified for pharmacy ERP context.**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Entity Models](#entity-models)
5. [Services](#services)
6. [Guards & Decorators](#guards--decorators)
7. [Controllers/Resolvers](#controllersresolvers)
8. [Implementation Steps](#implementation-steps)
9. [Testing](#testing)
10. [Advanced Topics](#advanced-topics)
    - [Transaction Handling](#transaction-handling)
    - [Soft Delete Implementation](#soft-delete-implementation)
    - [Email Verification Flow](#email-verification-flow)
11. [Configuration](#configuration)
12. [Medical Context Adaptations](#medical-context-adaptations)
13. [Summary](#summary)

---

## Overview

### What We're Building

A complete authentication and authorization system based on Vendure's proven architecture, adapted for pharmacy ERP:

- **Session-based authentication** (no JWT - better for internal systems)
- **Role-based access control (RBAC)** (Pharmacist, Admin, Doctor roles)
- **Multiple authentication methods** (native password, OAuth/SSO ready)
- **Token management** (email verification, password reset)
- **Session caching** (In-memory → Database, Redis optional)
- **Audit logging** (optional - for compliance tracking)
- **Pharmacy-specific features** (optional medical license tracking)

### Key Features

✅ Bcrypt password hashing (12 rounds)
✅ Random session tokens (crypto.randomBytes)
✅ Instant session invalidation
✅ SERIAL primary keys (simple, fast, human-readable)
✅ Strategy pattern for auth methods
✅ Decorator-based route protection (@Allow)
✅ Soft delete (preserves audit trail)
✅ Transaction-safe operations
✅ Email verification flow

### Dependencies

Already available in meditory-api:
- ✅ `@nestjs/common`, `@nestjs/core`, `@nestjs/typeorm`
- ✅ `typeorm`, `pg`
- ✅ `class-validator`, `class-transformer`

**New dependencies to install:**

```bash
npm install bcrypt @types/bcrypt
npm install cookie-session @types/cookie-session
npm install @nestjs/cache-manager cache-manager  # Optional: For Redis later
```

**Optional (for production):**
```bash
npm install @nestjs/throttler  # Rate limiting
npm install helmet  # Security headers
```

---

## Architecture

### High-Level Flow

```
1. User Login Request (Doctor/Pharmacist/Admin)
   ↓
2. AuthGuard intercepts
   ↓
3. NativeAuthenticationStrategy validates credentials
   ↓
4. Verify medical license (if applicable)
   ↓
5. SessionService creates session (cache + DB)
   ↓
6. Session token returned to client (cookie/header)
   ↓
7. Log authentication event (audit trail)
   ↓
8. Subsequent requests use token
   ↓
9. AuthGuard validates token → loads user + permissions
   ↓
10. RequestContext created with user + permissions
   ↓
11. Permission check (userHasPermissions)
   ↓
12. Route handler executes
   ↓
13. Audit log for sensitive operations
```

**Key Differences from Vendure:**
- ❌ **No channels** (simplified - single pharmacy initially)
- ❌ **No cart/order tracking** in session (not e-commerce)
- ✅ **Medical license validation** (doctors/pharmacists)
- ✅ **Shorter session timeouts** (15-30 min vs 1 year)
- ✅ **Audit logging** (compliance requirement)

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT REQUEST                        │
│         (Cookie: session=abc123 or Header)              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │      AuthGuard        │
         │  (NestJS Guard)       │
         └───────┬───────────────┘
                 │
                 ├──► 1. Extract session token
                 │
                 ├──► 2. SessionService.getSessionFromToken()
                 │         │
                 │         ├──► Check cache (Redis)
                 │         └──► Fallback to DB
                 │
                 ├──► 3. Create RequestContext
                 │         (user + session + channel + permissions)
                 │
                 ├──► 4. Check @Allow permissions
                 │         │
                 │         └──► requestContext.userHasPermissions()
                 │
                 └──► 5. Allow/Deny request
                          │
                          ▼
              ┌─────────────────────┐
              │   Route Handler     │
              │  (Resolver/Controller)│
              └─────────────────────┘
```

### Database Relationships

```
user (1) ────────── (*) authentication_method
  │                        │
  │                        ├─ NativeAuthenticationMethod
  │                        └─ ExternalAuthenticationMethod (OAuth, SSO)
  │
  ├────────── (*) session (AuthenticatedSession only - no anonymous)
  │
  ├────────── (*) user_roles_role ──── (*) role
  │
  └────────── (*) audit_log (tracks all actions)
```

**Simplified from Vendure:**
- Removed `AnonymousSession` (no guest users in medical context)
- Removed `channel` tables (no multi-tenancy initially)
- Removed `activeOrderId` (no shopping cart)
- Added `audit_log` table (compliance requirement)

---

## Database Schema

**Schema Organization:** All auth tables go in the `operational` schema (following meditory-api convention).

**Naming Convention:** Using `snake_case` to match existing meditory-api style.

### Table Definitions (PostgreSQL)

#### 1. `operational.users` Table

```sql
CREATE TABLE operational.users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,                    -- Primary identifier
    username VARCHAR,                                  -- Optional
    first_name VARCHAR,
    last_name VARCHAR,
    verified BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMP,
    deleted_at TIMESTAMP,                              -- Soft delete
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON operational.users(email);
CREATE INDEX idx_users_deleted ON operational.users(deleted_at) WHERE deleted_at IS NULL;
```

**Purpose:** Core user identity (no passwords stored here!)

**Key Points:**
- `user_id SERIAL` - Simple auto-incrementing IDs (1, 2, 3...)
- Clean and simple - just essential auth fields
- Profession-specific data (pharmacist license, etc.) can be added in separate tables later
- Soft delete via `deleted_at` preserves audit trail
- Smaller database size vs UUID (4 bytes vs 16 bytes)

---

#### 2. `operational.authentication_methods` Table

```sql
CREATE TABLE operational.authentication_methods (
    auth_method_id SERIAL PRIMARY KEY,
    type VARCHAR NOT NULL,                                      -- 'native' or 'external'
    user_id INTEGER NOT NULL REFERENCES operational.users(user_id) ON DELETE CASCADE,

    -- Native auth fields
    identifier VARCHAR,                                         -- email for native
    password_hash VARCHAR,                                      -- bcrypt hash
    verification_token VARCHAR,                                 -- email verification
    password_reset_token VARCHAR,                               -- password reset
    identifier_change_token VARCHAR,                            -- email change
    pending_identifier VARCHAR,                                 -- new email (pending)

    -- External auth fields (OAuth, SSO)
    strategy VARCHAR,                                           -- 'google', 'azure-ad', etc.
    external_identifier VARCHAR,                                -- OAuth provider user ID
    metadata JSONB,                                             -- OAuth metadata

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_methods_user ON operational.authentication_methods(user_id);
CREATE INDEX idx_auth_methods_type ON operational.authentication_methods(type);
CREATE INDEX idx_auth_methods_identifier ON operational.authentication_methods(identifier) WHERE identifier IS NOT NULL;
```

**Purpose:** Stores credentials and ALL tokens (verification, reset, etc.)

**Single Table Inheritance (STI):** Uses `type` column to differentiate between native and external auth.

**Security:** Passwords are NEVER stored in `users` table, always in this separate table.

---

#### 3. `operational.sessions` Table

```sql
CREATE TABLE operational.sessions (
    session_id SERIAL PRIMARY KEY,
    token VARCHAR(100) NOT NULL UNIQUE,                         -- session identifier (sent to client)
    user_id INTEGER NOT NULL REFERENCES operational.users(user_id) ON DELETE CASCADE,
    authentication_strategy VARCHAR NOT NULL,                    -- 'native', 'google', 'azure-ad'

    expires_at TIMESTAMP NOT NULL,
    invalidated_at TIMESTAMP,                                    -- NULL = active, timestamp = logged out

    -- Session metadata
    ip_address VARCHAR,                                          -- Client IP for security
    user_agent TEXT,                                             -- Browser/device info

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_sessions_token ON operational.sessions(token);
CREATE INDEX idx_sessions_user ON operational.sessions(user_id);
CREATE INDEX idx_sessions_expires ON operational.sessions(expires_at);
CREATE INDEX idx_sessions_active ON operational.sessions(user_id, invalidated_at) WHERE invalidated_at IS NULL;
```

**Purpose:** Active login sessions for authenticated users only

**Simplified from Vendure:**
- ❌ Removed `type` column (no anonymous sessions)
- ❌ Removed `activeOrderId` (no shopping cart)
- ❌ Removed `activeChannelId` (no multi-tenancy)
- ✅ Added `ip_address` and `user_agent` (security/audit)
- ✅ Shorter default expiry (30 minutes vs 1 year)

---

#### 4. `operational.roles` Table

```sql
CREATE TABLE operational.roles (
    role_id SERIAL PRIMARY KEY,
    code VARCHAR NOT NULL UNIQUE,                    -- 'superadmin', 'pharmacist', 'pharmacy_admin'
    name VARCHAR NOT NULL,                            -- Display name
    description TEXT,
    permissions TEXT[] NOT NULL,                      -- PostgreSQL array: {'ReadDrug', 'CreatePrescription'}
    is_system BOOLEAN NOT NULL DEFAULT false,         -- Prevent deletion of system roles

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_roles_code ON operational.roles(code);
```

**Purpose:** Stores roles with permissions as PostgreSQL array (better than CSV)

**Pharmacy ERP Roles:**
- `superadmin` - Full system access (system role, cannot be deleted)
- `pharmacist` - Dispense medications, manage inventory, view prescriptions
- `pharmacy_admin` - Pharmacy management, reports, user management
- `doctor` - Prescribe medications, view drugs (optional - if doctors use system)
- `patient` - View own prescriptions (future - if patient portal added)

---

#### 5. `operational.user_roles` Table (Join Table)

```sql
CREATE TABLE operational.user_roles (
    user_role_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES operational.users(user_id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES operational.roles(role_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    assigned_by_user_id INTEGER REFERENCES operational.users(user_id),  -- Audit: who assigned

    UNIQUE(user_id, role_id)  -- User can't have same role twice
);

CREATE INDEX idx_user_roles_user ON operational.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON operational.user_roles(role_id);
```

**Purpose:** Many-to-many relationship between users and roles with audit trail

---

#### 6. `operational.audit_logs` Table (Optional - Compliance)

```sql
CREATE TABLE operational.audit_logs (
    audit_log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES operational.users(user_id),    -- NULL for system actions
    action VARCHAR NOT NULL,                                   -- 'login', 'logout', 'create_prescription', etc.
    resource_type VARCHAR,                                     -- 'prescription', 'drug', 'order'
    resource_id INTEGER,                                       -- ID of affected resource
    metadata JSONB,                                            -- Additional context
    ip_address VARCHAR,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON operational.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON operational.audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON operational.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON operational.audit_logs(created_at DESC);
```

**Purpose:** Complete audit trail for compliance (HIPAA, medical regulations)

**Tracks:**
- All authentication events
- Prescription access/creation
- Patient record access
- Drug inventory changes
- Administrative actions

---

### Complete Schema Migration

```typescript
// migrations/1760400000000-CreateAuthTables.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthTables1760400000000 implements MigrationInterface {
  name = 'CreateAuthTables1760400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. users table
    await queryRunner.query(`
      CREATE TABLE operational.users (
        user_id SERIAL PRIMARY KEY,
        email VARCHAR NOT NULL UNIQUE,
        username VARCHAR,
        first_name VARCHAR,
        last_name VARCHAR,
        verified BOOLEAN NOT NULL DEFAULT false,
        last_login_at TIMESTAMP,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 2. authentication_methods table
    await queryRunner.query(`
      CREATE TABLE operational.authentication_methods (
        auth_method_id SERIAL PRIMARY KEY,
        type VARCHAR NOT NULL,
        user_id INTEGER NOT NULL REFERENCES operational.users(user_id) ON DELETE CASCADE,
        identifier VARCHAR,
        password_hash VARCHAR,
        verification_token VARCHAR,
        password_reset_token VARCHAR,
        identifier_change_token VARCHAR,
        pending_identifier VARCHAR,
        strategy VARCHAR,
        external_identifier VARCHAR,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 3. sessions table
    await queryRunner.query(`
      CREATE TABLE operational.sessions (
        session_id SERIAL PRIMARY KEY,
        token VARCHAR(100) NOT NULL UNIQUE,
        user_id INTEGER NOT NULL REFERENCES operational.users(user_id) ON DELETE CASCADE,
        authentication_strategy VARCHAR NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        invalidated_at TIMESTAMP,
        ip_address VARCHAR,
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 4. roles table
    await queryRunner.query(`
      CREATE TABLE operational.roles (
        role_id SERIAL PRIMARY KEY,
        code VARCHAR NOT NULL UNIQUE,
        name VARCHAR NOT NULL,
        description TEXT,
        permissions TEXT[] NOT NULL,
        is_system BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 5. user_roles join table
    await queryRunner.query(`
      CREATE TABLE operational.user_roles (
        user_role_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES operational.users(user_id) ON DELETE CASCADE,
        role_id INTEGER NOT NULL REFERENCES operational.roles(role_id) ON DELETE CASCADE,
        assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
        assigned_by_user_id INTEGER REFERENCES operational.users(user_id),
        UNIQUE(user_id, role_id)
      )
    `);

    // 6. audit_logs table (optional)
    await queryRunner.query(`
      CREATE TABLE operational.audit_logs (
        audit_log_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES operational.users(user_id),
        action VARCHAR NOT NULL,
        resource_type VARCHAR,
        resource_id INTEGER,
        metadata JSONB,
        ip_address VARCHAR,
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX idx_users_email ON operational.users(email)`);
    await queryRunner.query(`CREATE INDEX idx_users_deleted ON operational.users(deleted_at) WHERE deleted_at IS NULL`);

    await queryRunner.query(`CREATE INDEX idx_auth_methods_user ON operational.authentication_methods(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_auth_methods_type ON operational.authentication_methods(type)`);
    await queryRunner.query(`CREATE INDEX idx_auth_methods_identifier ON operational.authentication_methods(identifier) WHERE identifier IS NOT NULL`);

    await queryRunner.query(`CREATE UNIQUE INDEX idx_sessions_token ON operational.sessions(token)`);
    await queryRunner.query(`CREATE INDEX idx_sessions_user ON operational.sessions(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_sessions_expires ON operational.sessions(expires_at)`);
    await queryRunner.query(`CREATE INDEX idx_sessions_active ON operational.sessions(user_id, invalidated_at) WHERE invalidated_at IS NULL`);

    await queryRunner.query(`CREATE UNIQUE INDEX idx_roles_code ON operational.roles(code)`);

    await queryRunner.query(`CREATE INDEX idx_user_roles_user ON operational.user_roles(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_user_roles_role ON operational.user_roles(role_id)`);

    await queryRunner.query(`CREATE INDEX idx_audit_logs_user ON operational.audit_logs(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_action ON operational.audit_logs(action)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_resource ON operational.audit_logs(resource_type, resource_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_created ON operational.audit_logs(created_at DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE operational.audit_logs`);
    await queryRunner.query(`DROP TABLE operational.user_roles`);
    await queryRunner.query(`DROP TABLE operational.roles`);
    await queryRunner.query(`DROP TABLE operational.sessions`);
    await queryRunner.query(`DROP TABLE operational.authentication_methods`);
    await queryRunner.query(`DROP TABLE operational.users`);
  }
}
```

---

## Entity Models

### 1. User Entity

```typescript
// entities/user.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { AuthenticationMethod } from './authentication-method.entity';
import { AuthenticatedSession } from './authenticated-session.entity';
import { Role } from './role.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  identifier: string; // email or username

  @Column({ default: false })
  verified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => AuthenticationMethod, method => method.user)
  authenticationMethods: AuthenticationMethod[];

  @OneToMany(() => AuthenticatedSession, session => session.user)
  sessions: AuthenticatedSession[];

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'user_roles_role',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles: Role[];

  // Helper method
  getNativeAuthenticationMethod(): NativeAuthenticationMethod | undefined {
    return this.authenticationMethods?.find(
      m => m.type === 'NativeAuthenticationMethod'
    ) as NativeAuthenticationMethod;
  }
}
```

---

### 2. Authentication Method Entities

```typescript
// entities/authentication-method.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, TableInheritance } from 'typeorm';
import { User } from './user.entity';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class AuthenticationMethod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string; // 'NativeAuthenticationMethod' or 'ExternalAuthenticationMethod'

  @ManyToOne(() => User, user => user.authenticationMethods)
  user: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```

```typescript
// entities/native-authentication-method.entity.ts

import { ChildEntity, Column } from 'typeorm';
import { AuthenticationMethod } from './authentication-method.entity';

@ChildEntity('NativeAuthenticationMethod')
export class NativeAuthenticationMethod extends AuthenticationMethod {
  @Column()
  identifier: string; // email

  @Column()
  passwordHash: string; // bcrypt hash

  @Column({ nullable: true })
  verificationToken: string | null;

  @Column({ nullable: true })
  passwordResetToken: string | null;

  @Column({ nullable: true })
  identifierChangeToken: string | null;

  @Column({ nullable: true })
  pendingIdentifier: string | null; // new email pending verification
}
```

```typescript
// entities/external-authentication-method.entity.ts

import { ChildEntity, Column } from 'typeorm';
import { AuthenticationMethod } from './authentication-method.entity';

@ChildEntity('ExternalAuthenticationMethod')
export class ExternalAuthenticationMethod extends AuthenticationMethod {
  @Column()
  strategy: string; // 'google', 'facebook', etc.

  @Column()
  externalIdentifier: string; // OAuth provider user ID

  @Column({ type: 'text', nullable: true })
  metadata: string; // JSON string
}
```

---

### 3. Session Entities

```typescript
// entities/session.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, TableInheritance } from 'typeorm';
import { Channel } from './channel.entity';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class Session {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string; // 'AuthenticatedSession' or 'AnonymousSession'

  @Column({ unique: true })
  token: string;

  @Column({ type: 'timestamp' })
  expires: Date;

  @Column({ default: false })
  invalidated: boolean;

  @Column({ nullable: true })
  activeOrderId: number | null;

  @ManyToOne(() => Channel, { nullable: true })
  activeChannel: Channel | null;

  @Column({ nullable: true })
  activeChannelId: number | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```

```typescript
// entities/authenticated-session.entity.ts

import { ChildEntity, Column, ManyToOne } from 'typeorm';
import { Session } from './session.entity';
import { User } from './user.entity';

@ChildEntity('AuthenticatedSession')
export class AuthenticatedSession extends Session {
  @ManyToOne(() => User, user => user.sessions)
  user: User;

  @Column()
  authenticationStrategy: string; // 'native', 'google', etc.
}
```

```typescript
// entities/anonymous-session.entity.ts

import { ChildEntity } from 'typeorm';
import { Session } from './session.entity';

@ChildEntity('AnonymousSession')
export class AnonymousSession extends Session {
  // Anonymous sessions don't have a user
}
```

---

### 4. Role Entity

```typescript
// entities/role.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable } from 'typeorm';
import { Channel } from './channel.entity';
import { Permission } from '../types/permission.enum';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  code: string; // 'admin', 'customer', 'sales_manager'

  @Column()
  description: string;

  // TypeORM 'simple-array' stores as CSV
  @Column('simple-array')
  permissions: Permission[];

  @ManyToMany(() => Channel)
  @JoinTable({
    name: 'role_channels_channel',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'channelId', referencedColumnName: 'id' },
  })
  channels: Channel[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```

---

### 5. Channel Entity (SKIP - Not Needed for Pharmacy ERP)

**⚠️ NOTE:** Channels are for multi-tenancy (multiple pharmacies). Skip this for single pharmacy ERP.

**If you need multi-pharmacy support later:**

```typescript
// entities/channel.entity.ts (OPTIONAL - Only if multi-pharmacy needed)

import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'operational', name: 'channels' })
export class Channel {
  @PrimaryGeneratedColumn()
  channelId: number;

  @Column({ unique: true })
  code: string; // 'main-pharmacy', 'branch-1'

  @Column()
  name: string; // Display name

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
```

**For now: Skip channels entirely. Remove from:**
- Entities
- Services
- Auth logic
- Database schema

---

### 6. Permission Enum (Pharmacy ERP)

```typescript
// auth/enums/permission.enum.ts

export enum Permission {
  // Special permissions
  Authenticated = 'Authenticated',  // Any logged-in user
  Public = 'Public',                // No auth required
  Owner = 'Owner',                  // Resource owner only
  SuperAdmin = 'SuperAdmin',        // All permissions

  // Drug Management
  ReadDrug = 'ReadDrug',
  CreateDrug = 'CreateDrug',         // Admin only
  UpdateDrug = 'UpdateDrug',         // Admin only
  DeleteDrug = 'DeleteDrug',         // Admin only

  // Prescription Management
  ReadPrescription = 'ReadPrescription',
  CreatePrescription = 'CreatePrescription',    // Doctors only
  UpdatePrescription = 'UpdatePrescription',
  DeletePrescription = 'DeletePrescription',
  DispensePrescription = 'DispensePrescription', // Pharmacists only

  // Inventory Management
  ReadInventory = 'ReadInventory',
  UpdateInventory = 'UpdateInventory',   // Pharmacists, Admin

  // User Management
  CreateUser = 'CreateUser',         // Admin only
  ReadUser = 'ReadUser',
  UpdateUser = 'UpdateUser',
  DeleteUser = 'DeleteUser',         // Admin only
  ManageRoles = 'ManageRoles',       // Admin only

  // Reports
  ViewSalesReports = 'ViewSalesReports',     // Admin only
  ViewInventoryReports = 'ViewInventoryReports',
  ViewAuditLogs = 'ViewAuditLogs',           // SuperAdmin only

  // Orders (if needed)
  ReadOrder = 'ReadOrder',
  CreateOrder = 'CreateOrder',
  UpdateOrder = 'UpdateOrder',

  // Add more as your pharmacy ERP grows
}
```

---

## Services

### 1. Password Cipher Service

```typescript
// services/password-cipher.service.ts

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

@Injectable()
export class PasswordCipherService {
  /**
   * Hash a plaintext password using bcrypt
   */
  async hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, SALT_ROUNDS);
  }

  /**
   * Verify a plaintext password against a hash
   */
  async check(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }
}
```

---

### 2. Session Service

```typescript
// services/session.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedSession } from '../entities/authenticated-session.entity';
import { AnonymousSession } from '../entities/anonymous-session.entity';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';
import { Channel } from '../entities/channel.entity';
import * as crypto from 'crypto';

export interface CachedSession {
  id: number;
  token: string;
  expires: Date;
  cacheExpiry: number;
  activeOrderId?: number;
  activeChannelId?: number;
  user?: {
    id: number;
    identifier: string;
    verified: boolean;
    channelPermissions: Array<{
      id: number;
      permissions: string[];
    }>;
  };
  authenticationStrategy?: string;
}

@Injectable()
export class SessionService {
  private sessionDurationInMs = 365 * 24 * 60 * 60 * 1000; // 1 year
  private sessionCacheStrategy: Map<string, CachedSession> = new Map(); // Use Redis in production

  constructor(
    @InjectRepository(AuthenticatedSession)
    private authenticatedSessionRepository: Repository<AuthenticatedSession>,
    @InjectRepository(AnonymousSession)
    private anonymousSessionRepository: Repository<AnonymousSession>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
  ) {}

  /**
   * Create a new authenticated session after successful login
   */
  async createNewAuthenticatedSession(
    user: User,
    authenticationStrategyName: string,
    channel: Channel,
  ): Promise<AuthenticatedSession> {
    const token = this.generateSessionToken();
    const expires = this.getExpiryDate(this.sessionDurationInMs);

    const session = this.authenticatedSessionRepository.create({
      token,
      user,
      authenticationStrategy: authenticationStrategyName,
      expires,
      invalidated: false,
      activeChannel: channel,
      activeChannelId: channel.id,
    });

    const savedSession = await this.authenticatedSessionRepository.save(session);

    // Cache the session
    await this.cacheSession(this.serializeSession(savedSession));

    return savedSession;
  }

  /**
   * Create an anonymous session for guest users
   */
  async createAnonymousSession(channel: Channel): Promise<CachedSession> {
    const token = this.generateSessionToken();
    const expires = this.getExpiryDate(this.sessionDurationInMs);

    const session = this.anonymousSessionRepository.create({
      token,
      expires,
      invalidated: false,
      activeChannel: channel,
      activeChannelId: channel.id,
    });

    const savedSession = await this.anonymousSessionRepository.save(session);
    const serializedSession = this.serializeSession(savedSession);

    await this.cacheSession(serializedSession);

    return serializedSession;
  }

  /**
   * Get session from token (check cache first, then DB)
   */
  async getSessionFromToken(sessionToken: string): Promise<CachedSession | undefined> {
    // Try cache first
    let serializedSession = this.sessionCacheStrategy.get(sessionToken);

    const stale = serializedSession && serializedSession.cacheExpiry < Date.now() / 1000;
    const expired = serializedSession && serializedSession.expires < new Date();

    // If stale/expired/missing, hit database
    if (!serializedSession || stale || expired) {
      const session = await this.findSessionByToken(sessionToken);

      if (session) {
        serializedSession = this.serializeSession(session);
        await this.cacheSession(serializedSession);
        return serializedSession;
      }

      return undefined;
    }

    return serializedSession;
  }

  /**
   * Delete all sessions for a user (logout)
   */
  async deleteSessionsByUser(user: User): Promise<void> {
    const sessions = await this.authenticatedSessionRepository.find({
      where: { user: { id: user.id } },
    });

    await this.authenticatedSessionRepository.remove(sessions);

    // Clear from cache
    for (const session of sessions) {
      this.sessionCacheStrategy.delete(session.token);
    }
  }

  /**
   * Invalidate a session by token
   */
  async invalidateSession(sessionToken: string): Promise<void> {
    await this.sessionRepository.update(
      { token: sessionToken },
      { invalidated: true }
    );

    this.sessionCacheStrategy.delete(sessionToken);
  }

  /**
   * Find session by token from database
   */
  private async findSessionByToken(token: string): Promise<Session | null> {
    const session = await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.channels', 'channels')
      .where('session.token = :token', { token })
      .andWhere('session.invalidated = false')
      .getOne();

    if (session && session.expires > new Date()) {
      return session;
    }

    return null;
  }

  /**
   * Serialize session for caching
   */
  private serializeSession(session: Session): CachedSession {
    const sessionCacheTTL = 300; // 5 minutes
    const expiry = Date.now() / 1000 + sessionCacheTTL;

    const serialized: CachedSession = {
      cacheExpiry: expiry,
      id: session.id,
      token: session.token,
      expires: session.expires,
      activeOrderId: session.activeOrderId,
      activeChannelId: session.activeChannelId,
    };

    if (session instanceof AuthenticatedSession) {
      serialized.authenticationStrategy = session.authenticationStrategy;
      serialized.user = {
        id: session.user.id,
        identifier: session.user.identifier,
        verified: session.user.verified,
        channelPermissions: this.getUserChannelPermissions(session.user),
      };
    }

    return serialized;
  }

  /**
   * Compute user permissions per channel
   */
  private getUserChannelPermissions(user: User): Array<{ id: number; permissions: string[] }> {
    const channelPermissions = new Map<number, Set<string>>();

    for (const role of user.roles || []) {
      for (const channel of role.channels || []) {
        if (!channelPermissions.has(channel.id)) {
          channelPermissions.set(channel.id, new Set());
        }

        for (const permission of role.permissions) {
          channelPermissions.get(channel.id)!.add(permission);
        }
      }
    }

    return Array.from(channelPermissions.entries()).map(([id, permissions]) => ({
      id,
      permissions: Array.from(permissions),
    }));
  }

  /**
   * Cache a session (use Redis in production)
   */
  private async cacheSession(session: CachedSession): Promise<void> {
    this.sessionCacheStrategy.set(session.token, session);
  }

  /**
   * Generate a random session token
   */
  private generateSessionToken(): string {
    return crypto.randomBytes(20).toString('hex');
  }

  /**
   * Calculate expiry date
   */
  private getExpiryDate(timeToExpireInMs: number): Date {
    return new Date(Date.now() + timeToExpireInMs);
  }
}
```

---

### 3. Authentication Strategy (Strategy Pattern)

```typescript
// strategies/authentication-strategy.interface.ts

import { User } from '../entities/user.entity';

export interface AuthenticationStrategy<T = any> {
  readonly name: string;

  /**
   * Authenticate user with provided data
   * Returns User on success, false on failure
   */
  authenticate(data: T): Promise<User | false>;
}
```

```typescript
// strategies/native-authentication.strategy.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { NativeAuthenticationMethod } from '../entities/native-authentication-method.entity';
import { PasswordCipherService } from '../services/password-cipher.service';
import { AuthenticationStrategy } from './authentication-strategy.interface';

export interface NativeAuthenticationData {
  username: string; // email
  password: string;
}

@Injectable()
export class NativeAuthenticationStrategy implements AuthenticationStrategy<NativeAuthenticationData> {
  readonly name = 'native';

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(NativeAuthenticationMethod)
    private authMethodRepository: Repository<NativeAuthenticationMethod>,
    private passwordCipher: PasswordCipherService,
  ) {}

  async authenticate(data: NativeAuthenticationData): Promise<User | false> {
    // 1. Find user by email
    const user = await this.userRepository.findOne({
      where: { identifier: data.username },
      relations: ['authenticationMethods', 'roles', 'roles.channels'],
    });

    if (!user) {
      return false;
    }

    // 2. Get native auth method
    const nativeAuthMethod = user.getNativeAuthenticationMethod();
    if (!nativeAuthMethod) {
      return false;
    }

    // 3. Load password hash (select it explicitly)
    const authMethod = await this.authMethodRepository.findOne({
      where: { id: nativeAuthMethod.id },
      select: ['id', 'passwordHash'],
    });

    if (!authMethod) {
      return false;
    }

    // 4. Verify password
    const passwordMatches = await this.passwordCipher.check(
      data.password,
      authMethod.passwordHash
    );

    if (!passwordMatches) {
      return false;
    }

    return user;
  }

  /**
   * Verify password for a specific user
   */
  async verifyUserPassword(userId: number, password: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['authenticationMethods'],
    });

    if (!user) {
      return false;
    }

    const nativeAuthMethod = user.getNativeAuthenticationMethod();
    if (!nativeAuthMethod) {
      return false;
    }

    const authMethod = await this.authMethodRepository.findOne({
      where: { id: nativeAuthMethod.id },
      select: ['passwordHash'],
    });

    if (!authMethod) {
      return false;
    }

    return this.passwordCipher.check(password, authMethod.passwordHash);
  }
}
```

---

### 4. Auth Service

```typescript
// services/auth.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AuthenticatedSession } from '../entities/authenticated-session.entity';
import { Channel } from '../entities/channel.entity';
import { SessionService } from './session.service';
import { NativeAuthenticationStrategy } from '../strategies/native-authentication.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private sessionService: SessionService,
    private nativeAuthStrategy: NativeAuthenticationStrategy,
  ) {}

  /**
   * Authenticate user with username and password
   */
  async authenticate(
    username: string,
    password: string,
    channel: Channel,
  ): Promise<AuthenticatedSession | { error: string }> {
    const user = await this.nativeAuthStrategy.authenticate({ username, password });

    if (!user) {
      return { error: 'Invalid credentials' };
    }

    // Check if email verification is required
    if (!user.verified) {
      return { error: 'Email not verified' };
    }

    // Update last login
    user.lastLogin = new Date();
    await this.userRepository.save(user);

    // Create session
    const session = await this.sessionService.createNewAuthenticatedSession(
      user,
      this.nativeAuthStrategy.name,
      channel,
    );

    return session;
  }

  /**
   * Logout user by invalidating session
   */
  async logout(sessionToken: string): Promise<void> {
    await this.sessionService.invalidateSession(sessionToken);
  }

  /**
   * Logout from all devices (delete all user sessions)
   */
  async logoutAll(user: User): Promise<void> {
    await this.sessionService.deleteSessionsByUser(user);
  }
}
```

---

## Guards & Decorators

### 1. @Allow Decorator

```typescript
// decorators/allow.decorator.ts

import { SetMetadata } from '@nestjs/common';
import { Permission } from '../types/permission.enum';

export const PERMISSIONS_METADATA_KEY = '__permissions__';

/**
 * Decorator to specify required permissions for a route
 *
 * @example
 * @Allow(Permission.CreateProduct)
 * @Mutation()
 * createProduct() { ... }
 */
export const Allow = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_METADATA_KEY, permissions);
```

---

### 2. RequestContext

```typescript
// types/request-context.ts

import { Channel } from '../entities/channel.entity';
import { CachedSession } from '../services/session.service';
import { Permission } from './permission.enum';

export class RequestContext {
  constructor(
    public readonly channel: Channel,
    public readonly session?: CachedSession,
    public readonly isAuthorized: boolean = false,
    public readonly authorizedAsOwnerOnly: boolean = false,
  ) {}

  /**
   * Get active user ID from session
   */
  get activeUserId(): number | undefined {
    return this.session?.user?.id;
  }

  /**
   * Get channel ID
   */
  get channelId(): number {
    return this.channel.id;
  }

  /**
   * Check if user has required permissions on current channel
   */
  userHasPermissions(permissions: Permission[]): boolean {
    const user = this.session?.user;
    if (!user || !this.channelId) {
      return false;
    }

    const permissionsOnChannel = user.channelPermissions.find(
      c => c.id === this.channelId
    );

    if (permissionsOnChannel) {
      return this.arraysIntersect(
        permissionsOnChannel.permissions,
        permissions as string[]
      );
    }

    return false;
  }

  /**
   * Check if two arrays have common elements
   */
  private arraysIntersect(arr1: string[], arr2: string[]): boolean {
    return arr1.some(item => arr2.includes(item));
  }

  /**
   * Create an empty context (for background jobs)
   */
  static empty(channel: Channel): RequestContext {
    return new RequestContext(channel, undefined, true, false);
  }
}
```

---

### 3. @Ctx Decorator (Extract RequestContext)

```typescript
// decorators/ctx.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { RequestContext } from '../types/request-context';

export const REQUEST_CONTEXT_KEY = '__request_context__';

/**
 * Decorator to inject RequestContext into route handlers
 *
 * @example
 * @Query()
 * getProducts(@Ctx() ctx: RequestContext) { ... }
 */
export const Ctx = createParamDecorator(
  (data: unknown, context: ExecutionContext): RequestContext => {
    // For GraphQL
    if (context.getType<string>() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context).getContext();
      return gqlContext.req[REQUEST_CONTEXT_KEY];
    }

    // For REST
    const request = context.switchToHttp().getRequest();
    return request[REQUEST_CONTEXT_KEY];
  },
);
```

---

### 4. AuthGuard

```typescript
// guards/auth.guard.ts

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../entities/channel.entity';
import { SessionService } from '../services/session.service';
import { RequestContext } from '../types/request-context';
import { Permission } from '../types/permission.enum';
import { PERMISSIONS_METADATA_KEY } from '../decorators/allow.decorator';
import { REQUEST_CONTEXT_KEY } from '../decorators/ctx.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private sessionService: SessionService,
    @InjectRepository(Channel)
    private channelRepository: Repository<Channel>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Get required permissions from @Allow decorator
    const permissions = this.reflector.get<Permission[]>(
      PERMISSIONS_METADATA_KEY,
      context.getHandler()
    );

    // 2. Get request object
    const request = this.getRequest(context);

    // 3. Extract session token
    const sessionToken = this.extractSessionToken(request);

    // 4. Get or create session
    let session = sessionToken
      ? await this.sessionService.getSessionFromToken(sessionToken)
      : undefined;

    // 5. Get active channel (for multi-tenant)
    const channel = await this.getActiveChannel(request);

    // 6. Handle Owner permission (create anonymous session if needed)
    const hasOwnerPermission = permissions?.includes(Permission.Owner);
    if (hasOwnerPermission && !session) {
      session = await this.sessionService.createAnonymousSession(channel);
      this.setSessionToken(request, session.token);
    }

    // 7. Create RequestContext
    const isAuthorized = !!session?.user;
    const authorizedAsOwnerOnly = hasOwnerPermission && !permissions?.some(p => p !== Permission.Owner);

    const requestContext = new RequestContext(
      channel,
      session,
      isAuthorized,
      authorizedAsOwnerOnly
    );

    // 8. Store RequestContext on request object
    request[REQUEST_CONTEXT_KEY] = requestContext;

    // 9. Check permissions
    const isPublic = permissions?.includes(Permission.Public);
    if (!permissions || isPublic) {
      return true; // No auth required
    }

    const canActivate =
      requestContext.userHasPermissions(permissions) ||
      requestContext.authorizedAsOwnerOnly;

    if (!canActivate) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  /**
   * Extract request object from execution context
   */
  private getRequest(context: ExecutionContext): any {
    if (context.getType<string>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext().req;
    }
    return context.switchToHttp().getRequest();
  }

  /**
   * Extract session token from cookie or Authorization header
   */
  private extractSessionToken(request: any): string | undefined {
    // Try cookie first
    if (request.session?.token) {
      return request.session.token;
    }

    // Try Authorization header
    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }

  /**
   * Set session token in cookie
   */
  private setSessionToken(request: any, token: string): void {
    if (request.session) {
      request.session.token = token;
    }
  }

  /**
   * Get active channel from request (default channel for now)
   */
  private async getActiveChannel(request: any): Promise<Channel> {
    // For multi-tenant: extract from subdomain, header, etc.
    // For now, return default channel
    let channel = await this.channelRepository.findOne({
      where: { code: 'default' }
    });

    if (!channel) {
      // Create default channel if it doesn't exist
      channel = this.channelRepository.create({
        code: 'default',
        token: 'default-channel-token',
        defaultLanguageCode: 'en',
        defaultCurrencyCode: 'USD',
      });
      channel = await this.channelRepository.save(channel);
    }

    return channel;
  }
}
```

---

## Controllers/Resolvers

### REST Controller Example

```typescript
// controllers/auth.controller.ts

import { Controller, Post, Body, Req, Res, UseGuards, Get } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from '../guards/auth.guard';
import { Ctx } from '../decorators/ctx.decorator';
import { Allow } from '../decorators/allow.decorator';
import { RequestContext } from '../types/request-context';
import { Permission } from '../types/permission.enum';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const channel = req['__channel__']; // Set by AuthGuard

    const result = await this.authService.authenticate(email, password, channel);

    if ('error' in result) {
      return res.status(401).json({ error: result.error });
    }

    // Set session cookie
    req.session = { token: result.token };

    return res.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.identifier,
        verified: result.user.verified,
      },
    });
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @Allow(Permission.Authenticated)
  async logout(@Req() req: Request, @Res() res: Response) {
    const sessionToken = req.session?.token;

    if (sessionToken) {
      await this.authService.logout(sessionToken);
    }

    req.session = null;

    return res.json({ success: true });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @Allow(Permission.Authenticated)
  async me(@Ctx() ctx: RequestContext) {
    return {
      id: ctx.session?.user?.id,
      email: ctx.session?.user?.identifier,
      verified: ctx.session?.user?.verified,
      permissions: ctx.session?.user?.channelPermissions,
    };
  }
}
```

---

### GraphQL Resolver Example

```typescript
// resolvers/auth.resolver.ts

import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from '../guards/auth.guard';
import { Ctx } from '../decorators/ctx.decorator';
import { Allow } from '../decorators/allow.decorator';
import { RequestContext } from '../types/request-context';
import { Permission } from '../types/permission.enum';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => LoginResult)
  async login(
    @Args('email') email: string,
    @Args('password') password: string,
    @Ctx() ctx: RequestContext,
  ) {
    const result = await this.authService.authenticate(
      email,
      password,
      ctx.channel
    );

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      token: result.token,
      user: result.user,
    };
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  @Allow(Permission.Authenticated)
  async logout(@Ctx() ctx: RequestContext) {
    if (ctx.session) {
      await this.authService.logout(ctx.session.token);
    }
    return true;
  }

  @Query(() => CurrentUser, { nullable: true })
  @UseGuards(AuthGuard)
  @Allow(Permission.Authenticated)
  async me(@Ctx() ctx: RequestContext) {
    return ctx.session?.user;
  }
}
```

---

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install @nestjs/common @nestjs/core @nestjs/typeorm typeorm pg bcrypt cookie-session
npm install -D @types/bcrypt @types/cookie-session
```

---

### Step 2: Create Database Tables

Run the migration:

```bash
npm run typeorm migration:run
```

Or use the migration provided in the [Database Schema](#database-schema) section.

---

### Step 3: Create Entities

Create all entities in the `entities/` folder:
- `user.entity.ts`
- `authentication-method.entity.ts`
- `native-authentication-method.entity.ts`
- `external-authentication-method.entity.ts`
- `session.entity.ts`
- `authenticated-session.entity.ts`
- `anonymous-session.entity.ts`
- `role.entity.ts`
- `channel.entity.ts`

---

### Step 4: Create Services

Create services in the `services/` folder:
- `password-cipher.service.ts`
- `session.service.ts`
- `auth.service.ts`

---

### Step 5: Create Strategies

Create authentication strategies in the `strategies/` folder:
- `authentication-strategy.interface.ts`
- `native-authentication.strategy.ts`

---

### Step 6: Create Guards & Decorators

Create guards and decorators:
- `guards/auth.guard.ts`
- `decorators/allow.decorator.ts`
- `decorators/ctx.decorator.ts`
- `types/request-context.ts`
- `types/permission.enum.ts`

---

### Step 7: Register in Module

```typescript
// auth.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { AuthenticationMethod } from './entities/authentication-method.entity';
import { NativeAuthenticationMethod } from './entities/native-authentication-method.entity';
import { ExternalAuthenticationMethod } from './entities/external-authentication-method.entity';
import { Session } from './entities/session.entity';
import { AuthenticatedSession } from './entities/authenticated-session.entity';
import { AnonymousSession } from './entities/anonymous-session.entity';
import { Role } from './entities/role.entity';
import { Channel } from './entities/channel.entity';
import { PasswordCipherService } from './services/password-cipher.service';
import { SessionService } from './services/session.service';
import { AuthService } from './services/auth.service';
import { NativeAuthenticationStrategy } from './strategies/native-authentication.strategy';
import { AuthGuard } from './guards/auth.guard';
import { AuthController } from './controllers/auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AuthenticationMethod,
      NativeAuthenticationMethod,
      ExternalAuthenticationMethod,
      Session,
      AuthenticatedSession,
      AnonymousSession,
      Role,
      Channel,
    ]),
  ],
  providers: [
    PasswordCipherService,
    SessionService,
    AuthService,
    NativeAuthenticationStrategy,
    AuthGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, SessionService, AuthGuard],
})
export class AuthModule {}
```

```typescript
// app.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/guards/auth.guard';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'password',
      database: 'myapp',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // Use migrations in production
    }),
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard, // Apply globally
    },
  ],
})
export class AppModule {}
```

---

### Step 8: Setup Middleware (CRITICAL - Order Matters!)

**⚠️ IMPORTANT:** Middleware order is critical for auth to work correctly!

```typescript
// main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieSession from 'cookie-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ==========================================
  // MIDDLEWARE ORDER IS CRITICAL:
  // ==========================================

  // 1. FIRST: Cookie session (MUST be before guards)
  //    This parses the session cookie and makes it available to guards
  app.use(
    cookieSession({
      name: 'session',
      keys: [process.env.SESSION_SECRET || 'dev-secret-key'],
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax',
    })
  );

  // 2. SECOND: CORS (if your frontend is on different domain)
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true, // IMPORTANT: Allow cookies to be sent
  });

  // 3. Body parsers (automatic in NestJS, but shown for completeness)
  // app.use(express.json());
  // app.use(express.urlencoded({ extended: true }));

  // 4. Guards run AFTER middleware (automatically via APP_GUARD provider)
  //    No need to manually attach here!

  await app.listen(3000);
  console.log(`Application is running on: http://localhost:3000`);
}
bootstrap();
```

**Request Flow:**
```
1. Request arrives
   ↓
2. Cookie session middleware parses session cookie → request.session
   ↓
3. AuthGuard executes (via APP_GUARD provider)
   ├─ Extracts session token from cookie/header
   ├─ Loads session from DB/cache
   ├─ Creates RequestContext
   └─ Attaches to request[REQUEST_CONTEXT_KEY]
   ↓
4. Controller/Resolver executes
   └─ @Ctx() decorator extracts RequestContext from request
```

---

### Step 9: Seed Initial Data

Create a seeder to populate default channel and roles:

```typescript
// seeders/initial-data.seeder.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../auth/entities/channel.entity';
import { Role } from '../auth/entities/role.entity';
import { User } from '../auth/entities/user.entity';
import { NativeAuthenticationMethod } from '../auth/entities/native-authentication-method.entity';
import { PasswordCipherService } from '../auth/services/password-cipher.service';
import { Permission } from '../auth/types/permission.enum';

@Injectable()
export class InitialDataSeeder {
  constructor(
    @InjectRepository(Channel)
    private channelRepository: Repository<Channel>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(NativeAuthenticationMethod)
    private authMethodRepository: Repository<NativeAuthenticationMethod>,
    private passwordCipher: PasswordCipherService,
  ) {}

  async seed() {
    // 1. Create default channel
    let channel = await this.channelRepository.findOne({
      where: { code: 'default' }
    });

    if (!channel) {
      channel = this.channelRepository.create({
        code: 'default',
        token: 'default-channel',
        defaultLanguageCode: 'en',
        defaultCurrencyCode: 'USD',
      });
      channel = await this.channelRepository.save(channel);
      console.log('✅ Default channel created');
    }

    // 2. Create SuperAdmin role
    let superAdminRole = await this.roleRepository.findOne({
      where: { code: 'superadmin' }
    });

    if (!superAdminRole) {
      superAdminRole = this.roleRepository.create({
        code: 'superadmin',
        description: 'Super Administrator',
        permissions: Object.values(Permission), // All permissions
        channels: [channel],
      });
      superAdminRole = await this.roleRepository.save(superAdminRole);
      console.log('✅ SuperAdmin role created');
    }

    // 3. Create Customer role
    let customerRole = await this.roleRepository.findOne({
      where: { code: 'customer' }
    });

    if (!customerRole) {
      customerRole = this.roleRepository.create({
        code: 'customer',
        description: 'Customer',
        permissions: [Permission.Authenticated, Permission.Owner],
        channels: [channel],
      });
      customerRole = await this.roleRepository.save(customerRole);
      console.log('✅ Customer role created');
    }

    // 4. Create superadmin user
    let superadmin = await this.userRepository.findOne({
      where: { identifier: 'superadmin@example.com' }
    });

    if (!superadmin) {
      superadmin = this.userRepository.create({
        identifier: 'superadmin@example.com',
        verified: true,
        roles: [superAdminRole],
      });
      superadmin = await this.userRepository.save(superadmin);

      // Create native auth method with password
      const passwordHash = await this.passwordCipher.hash('superadmin123');
      const authMethod = this.authMethodRepository.create({
        type: 'NativeAuthenticationMethod',
        user: superadmin,
        identifier: 'superadmin@example.com',
        passwordHash,
      });
      await this.authMethodRepository.save(authMethod);

      console.log('✅ Superadmin user created (email: superadmin@example.com, password: superadmin123)');
    }

    console.log('🌱 Seeding complete!');
  }
}
```

Run the seeder:

```typescript
// seed.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { InitialDataSeeder } from './seeders/initial-data.seeder';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seeder = app.get(InitialDataSeeder);

  await seeder.seed();

  await app.close();
}

seed();
```

```bash
ts-node src/seed.ts
```

---

## Testing

### Manual Testing with cURL

#### 1. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@example.com",
    "password": "superadmin123"
  }' \
  -c cookies.txt
```

Response:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "superadmin@example.com",
    "verified": true
  }
}
```

#### 2. Get Current User

```bash
curl -X GET http://localhost:3000/auth/me \
  -b cookies.txt
```

Response:
```json
{
  "id": 1,
  "email": "superadmin@example.com",
  "verified": true,
  "permissions": [
    {
      "id": 1,
      "permissions": ["Authenticated", "SuperAdmin", "CreateProduct", ...]
    }
  ]
}
```

#### 3. Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -b cookies.txt
```

Response:
```json
{
  "success": true
}
```

---

### Unit Tests

```typescript
// auth.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { SessionService } from './session.service';
import { NativeAuthenticationStrategy } from '../strategies/native-authentication.strategy';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: any;
  let mockSessionService: any;
  let mockNativeStrategy: any;

  beforeEach(async () => {
    mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockSessionService = {
      createNewAuthenticatedSession: jest.fn(),
      invalidateSession: jest.fn(),
    };

    mockNativeStrategy = {
      authenticate: jest.fn(),
      name: 'native',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: NativeAuthenticationStrategy,
          useValue: mockNativeStrategy,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should authenticate user successfully', async () => {
    const mockUser = {
      id: 1,
      identifier: 'test@example.com',
      verified: true,
      lastLogin: null,
    };

    const mockSession = {
      id: 1,
      token: 'abc123',
      user: mockUser,
    };

    mockNativeStrategy.authenticate.mockResolvedValue(mockUser);
    mockUserRepository.save.mockResolvedValue(mockUser);
    mockSessionService.createNewAuthenticatedSession.mockResolvedValue(mockSession);

    const channel = { id: 1, code: 'default' };
    const result = await service.authenticate('test@example.com', 'password', channel);

    expect(result).toEqual(mockSession);
    expect(mockUser.lastLogin).toBeDefined();
  });

  it('should return error for invalid credentials', async () => {
    mockNativeStrategy.authenticate.mockResolvedValue(false);

    const channel = { id: 1, code: 'default' };
    const result = await service.authenticate('test@example.com', 'wrong', channel);

    expect(result).toEqual({ error: 'Invalid credentials' });
  });

  it('should return error for unverified user', async () => {
    const mockUser = {
      id: 1,
      identifier: 'test@example.com',
      verified: false,
    };

    mockNativeStrategy.authenticate.mockResolvedValue(mockUser);

    const channel = { id: 1, code: 'default' };
    const result = await service.authenticate('test@example.com', 'password', channel);

    expect(result).toEqual({ error: 'Email not verified' });
  });
});
```

---

## Advanced Topics

### Transaction Handling

**Why Transactions Matter:** Auth operations must be atomic - either everything succeeds or everything rolls back.

#### Pattern 1: Service-Level Transactions

```typescript
// services/auth.service.ts

import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    @InjectConnection()
    private connection: Connection,
  ) {}

  async registerUser(email: string, password: string): Promise<User> {
    // Start transaction - all operations are atomic
    return this.connection.transaction(async (manager) => {
      // 1. Create user
      const user = manager.create(User, {
        identifier: email,
        verified: false,
      });
      await manager.save(user);

      // 2. Create auth method with password
      const passwordHash = await this.passwordCipher.hash(password);
      const authMethod = manager.create(NativeAuthenticationMethod, {
        user,
        identifier: email,
        passwordHash,
        verificationToken: this.generateVerificationToken(),
      });
      await manager.save(authMethod);

      // 3. Assign default role
      const customerRole = await manager.findOne(Role, {
        where: { code: 'customer' },
      });
      user.roles = [customerRole];
      await manager.save(user);

      // If ANY step fails, entire transaction rolls back!
      return user;
    });
  }
}
```

#### Pattern 2: Auth Login with Transaction

```typescript
async authenticate(email: string, password: string): Promise<Session | { error: string }> {
  return this.connection.transaction(async (manager) => {
    // 1. Find and validate user
    const user = await manager.findOne(User, {
      where: { identifier: email, deletedAt: IsNull() },
      relations: ['authenticationMethods', 'roles'],
    });

    if (!user) return { error: 'Invalid credentials' };

    // 2. Verify password
    const valid = await this.passwordCipher.check(password, passwordHash);
    if (!valid) return { error: 'Invalid credentials' };

    // 3. Update last login
    user.lastLogin = new Date();
    await manager.save(user);

    // 4. Create session
    const session = manager.create(Session, {
      token: this.generateSessionToken(),
      user,
      authenticationStrategy: 'native',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
    await manager.save(session);

    return session;
  });
}
```

### Soft Delete Implementation

**Why Soft Delete:** Preserve audit trail and allow user restoration.

#### Entity Implementation

```typescript
// entities/user.entity.ts

@Entity({ schema: 'operational', name: 'users' })
export class User {
  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  // Helper methods
  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  softDelete(): void {
    this.deletedAt = new Date();
  }

  restore(): void {
    this.deletedAt = null;
  }
}
```

#### Query Handling - ALWAYS Filter Soft-Deleted

```typescript
// services/user.service.ts

import { IsNull } from 'typeorm';

@Injectable()
export class UserService {
  // ❌ WRONG - Will return deleted users!
  async findOneWrong(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  // ✅ CORRECT - Filters out deleted users
  async findOne(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        userId: id,
        deletedAt: IsNull(), // ← CRITICAL!
      },
    });
  }

  // Alternative: Use query builder
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .andWhere('user.deleted_at IS NULL') // ← Always add this
      .getOne();
  }

  // Soft delete instead of hard delete
  async delete(id: number): Promise<void> {
    await this.userRepository.update(id, {
      deletedAt: new Date(),
    });

    // Also invalidate all sessions
    await this.sessionService.deleteSessionsByUserId(id);
  }

  // Admin operation: View deleted users
  async findAllIncludingDeleted(): Promise<User[]> {
    return this.userRepository.find({
      withDeleted: true, // TypeORM built-in feature
    });
  }

  // Restore deleted user
  async restore(id: number): Promise<void> {
    await this.userRepository.update(id, {
      deletedAt: null,
    });
  }
}
```

#### Prevent Deleted Users from Logging In

```typescript
// strategies/native-authentication.strategy.ts

async authenticate(data: NativeAuthenticationData): Promise<User | false> {
  const user = await this.userRepository.findOne({
    where: {
      identifier: data.username,
      deletedAt: IsNull(), // ← Deleted users can't login!
    },
    relations: ['authenticationMethods', 'roles'],
  });

  if (!user) {
    return false;
  }

  // ... verify password
}
```

### Email Verification Flow

Complete implementation of email verification:

#### Step 1: Registration Creates Token

```typescript
// services/auth.service.ts

import * as crypto from 'crypto';

async register(email: string, password: string): Promise<User> {
  return this.connection.transaction(async (manager) => {
    // Create unverified user
    const user = manager.create(User, {
      identifier: email,
      verified: false, // ← Not verified yet
    });
    await manager.save(user);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const passwordHash = await this.passwordCipher.hash(password);

    const authMethod = manager.create(NativeAuthenticationMethod, {
      user,
      identifier: email,
      passwordHash,
      verificationToken, // ← Store token
    });
    await manager.save(authMethod);

    // Assign role
    const customerRole = await manager.findOne(Role, {
      where: { code: 'customer' },
    });
    user.roles = [customerRole];
    await manager.save(user);

    // Send email (async, don't block)
    this.emailService.sendVerificationEmail(email, verificationToken).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    return user;
  });
}
```

#### Step 2: Verification Endpoint

```typescript
// controllers/auth.controller.ts

@Get('verify')
async verifyEmail(@Query('token') token: string) {
  const result = await this.authService.verifyEmail(token);

  if (!result) {
    throw new BadRequestException('Invalid or expired verification token');
  }

  return {
    success: true,
    message: 'Email verified successfully. You can now log in.',
  };
}
```

#### Step 3: Verify Service Method

```typescript
// services/auth.service.ts

async verifyEmail(token: string): Promise<boolean> {
  return this.connection.transaction(async (manager) => {
    // Find auth method by token
    const authMethod = await manager.findOne(NativeAuthenticationMethod, {
      where: { verificationToken: token },
      relations: ['user'],
    });

    if (!authMethod) {
      return false; // Invalid token
    }

    // Check token age (24 hour expiry)
    const tokenAge = Date.now() - authMethod.createdAt.getTime();
    const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
    if (tokenAge > MAX_AGE) {
      return false; // Expired
    }

    // Mark user as verified
    authMethod.user.verified = true;
    await manager.save(authMethod.user);

    // Clear token (one-time use)
    authMethod.verificationToken = null;
    await manager.save(authMethod);

    return true;
  });
}
```

#### Step 4: Resend Verification

```typescript
// controllers/auth.controller.ts

@Post('resend-verification')
async resendVerification(@Body('email') email: string) {
  const result = await this.authService.resendVerificationEmail(email);

  if (!result) {
    throw new BadRequestException('User not found or already verified');
  }

  return {
    success: true,
    message: 'Verification email sent',
  };
}

// services/auth.service.ts

async resendVerificationEmail(email: string): Promise<boolean> {
  return this.connection.transaction(async (manager) => {
    const user = await manager.findOne(User, {
      where: { identifier: email, verified: false, deletedAt: IsNull() },
      relations: ['authenticationMethods'],
    });

    if (!user) {
      return false; // Already verified or doesn't exist
    }

    const nativeAuth = user.getNativeAuthenticationMethod();
    if (!nativeAuth) {
      return false;
    }

    // Generate new token
    nativeAuth.verificationToken = crypto.randomBytes(32).toString('hex');
    await manager.save(nativeAuth);

    // Send email
    await this.emailService.sendVerificationEmail(email, nativeAuth.verificationToken);

    return true;
  });
}
```

#### Step 5: Block Unverified Login

```typescript
// services/auth.service.ts

async authenticate(email: string, password: string): Promise<Session | { error: string }> {
  const user = await this.nativeAuthStrategy.authenticate({ username: email, password });

  if (!user) {
    return { error: 'Invalid credentials' };
  }

  // Check verification
  if (!user.verified) {
    return {
      error: 'Email not verified. Please check your inbox.',
      code: 'EMAIL_NOT_VERIFIED',
      email: user.identifier, // Allow client to show "resend" button
    };
  }

  // Continue with login...
}
```

---

## Configuration

### Environment Variables

```env
# .env

# Database (already configured in meditory-api)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_DATABASE=meditory_erp_test

# Session
SESSION_SECRET=your-very-long-random-secret-key-min-32-chars
SESSION_MAX_AGE=31536000000  # 1 year (pharmacy ERP - trusted workstations)

# Auth
BCRYPT_SALT_ROUNDS=12
REQUIRE_EMAIL_VERIFICATION=true
REQUIRE_LICENSE_VERIFICATION=true  # NEW: Verify medical licenses for doctors/pharmacists

# Security (optional - for enhanced security)
ENABLE_AUDIT_LOGGING=true
MAX_FAILED_LOGIN_ATTEMPTS=5
LOCK_ACCOUNT_DURATION=1800000  # 30 minutes after failed attempts
```

**Note on SESSION_MAX_AGE:** 1 year is fine for pharmacy ERP since staff use dedicated workstations. For a patient-facing mobile app, you'd want shorter sessions (15-30 min).

### Config Service

```typescript
// config/auth.config.ts

export interface AuthConfig {
  sessionDuration: number;
  sessionCacheTTL: number;
  bcryptSaltRounds: number;
  requireVerification: boolean;
  cookieOptions: {
    name: string;
    secret: string;
    maxAge: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
}

export const authConfig: AuthConfig = {
  sessionDuration: parseInt(process.env.SESSION_MAX_AGE || '31536000000', 10),
  sessionCacheTTL: 300, // 5 minutes
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  requireVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
  cookieOptions: {
    name: 'session',
    secret: process.env.SESSION_SECRET || 'change-me-in-production',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '31536000000', 10),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
};
```

---

---

## Medical Context Adaptations

### What We Changed from Vendure

#### **Removed (Simplified for Pharmacy ERP)**
- ❌ **Channels** - No multi-tenancy initially (single pharmacy location)
- ❌ **Anonymous Sessions** - No guest users in ERP
- ❌ **Cart/Order Tracking** - Different from e-commerce
- ❌ **Channel-scoped permissions** - Simplified permission model

#### **Added (Pharmacy-Specific)**
- ✅ **Audit Logging** - Basic audit trail (optional, for larger pharmacies)
- ✅ **Session Metadata** - Track `ip_address`, `user_agent` for security
- ✅ **Pharmacy Roles** - Pharmacist, PharmacyAdmin roles
- ✅ **Soft Delete** - Preserves data for audit trail via `deleted_at`

#### **Modified**
- 🔄 **SERIAL Primary Keys** - Simple auto-increment (1, 2, 3...) instead of UUID
  - Smaller, faster, human-readable
  - Perfect for internal pharmacy ERP
- 🔄 **snake_case naming** - Instead of camelCase (matches meditory-api)
- 🔄 **operational schema** - All tables in `operational` schema
- 🔄 **PostgreSQL arrays** - For permissions instead of CSV

---

## Summary

You now have a complete Vendure-style authentication system **adapted for Meditory pharmacy ERP** with:

✅ **6 database tables** (users, authentication_methods, sessions, roles, user_roles, audit_logs)
✅ **SERIAL primary keys** - Simple, fast, human-readable IDs
✅ **operational schema** for all auth tables
✅ **Strategy pattern** for multiple auth methods (native, OAuth/SSO ready)
✅ **Guards & Decorators** for route protection
✅ **Session-based auth** with in-memory caching (Redis optional)
✅ **RBAC** for Pharmacist, Admin, Doctor roles
✅ **Audit trail** (optional for compliance)

### Implementation Checklist

#### Phase 1: Core Auth (1-2 days)
- [ ] Install dependencies (bcrypt, cookie-session)
- [ ] Run migration to create 6 tables
- [ ] Create User, AuthenticationMethod, Session entities
- [ ] Create PasswordCipherService
- [ ] Create SessionService
- [ ] Create NativeAuthenticationStrategy
- [ ] Create AuthService
- [ ] Create @Allow and @Ctx decorators
- [ ] Create AuthGuard
- [ ] Create AuthController (login, logout, me)
- [ ] Seed SuperAdmin user
- [ ] Test login/logout flow

#### Phase 2: Roles & Permissions (1 day)
- [ ] Create Role entity
- [ ] Seed predefined roles (Pharmacist, Admin)
- [ ] Add permission checking to AuthGuard
- [ ] Create UserController (assign roles)
- [ ] Protect existing drug routes with @Allow
- [ ] Test permission enforcement

#### Phase 3: Optional Enhancements
- [ ] Add email verification flow
- [ ] Add password reset flow
- [ ] Add OAuth/SSO (for corporate pharmacies)
- [ ] Set up Redis for session caching
- [ ] Add rate limiting
- [ ] Add audit logging viewer

### Next Steps

1. **Start with Phase 1** - Get core auth working (user login/logout)
2. **Add roles in Phase 2** - Protect your drug management routes
3. **Keep it simple** - Don't over-engineer for a pharmacy ERP
4. **SSO later** - If pharmacies need Azure AD integration

This guide provides everything you need for a production-ready pharmacy ERP authentication system! 💊

---

## Implementation Quality Checklist

Before deploying to production, verify:

### ✅ Security
- [ ] SESSION_SECRET is strong and stored in environment variable
- [ ] Bcrypt salt rounds set to 12
- [ ] HTTPS enforced in production (secure cookies)
- [ ] CORS properly configured
- [ ] Soft delete implemented (deletedAt IS NULL checks everywhere)
- [ ] Deleted users cannot login
- [ ] Unverified users cannot login (if email verification enabled)

### ✅ Database
- [ ] All 6 tables created in `operational` schema
- [ ] All indexes created
- [ ] Foreign keys with ON DELETE CASCADE
- [ ] SERIAL primary keys (not UUID)
- [ ] PostgreSQL arrays for permissions (not CSV)

### ✅ Code Quality
- [ ] Transactions used for user registration
- [ ] Transactions used for login (update lastLogin + create session)
- [ ] Session token generated with crypto.randomBytes
- [ ] Middleware order: cookie-session → CORS → guards
- [ ] AuthGuard applied globally via APP_GUARD
- [ ] @Allow decorator works on controllers
- [ ] @Ctx() decorator extracts RequestContext

### ✅ Testing
- [ ] Can register new user
- [ ] Can login with correct credentials
- [ ] Cannot login with wrong password
- [ ] Cannot login with deleted user
- [ ] Cannot login with unverified user (if verification enabled)
- [ ] Session invalidation works (logout)
- [ ] Permissions are checked (@Allow decorator)
- [ ] Soft delete prevents login

### ✅ Functionality
- [ ] Password hashing/verification works
- [ ] Session creation works
- [ ] Session validation works
- [ ] Role assignment works
- [ ] Permission checking works
- [ ] Email verification flow (if enabled)
- [ ] Password reset flow (if implemented)

### ⚠️ Common Mistakes to Avoid

1. **Forgetting deletedAt filter** - Always use `deletedAt: IsNull()` in queries
2. **Wrong middleware order** - cookie-session MUST come before guards
3. **Not using transactions** - User registration MUST be atomic
4. **Hard-coding secrets** - Use environment variables
5. **Skipping indexes** - Sessions table MUST have token index
6. **Not invalidating sessions on delete** - Soft-deleting user must invalidate sessions
7. **Channels** - Skip entirely unless multi-pharmacy needed

---

## Final Notes

**What You Have:**
- Production-ready Vendure-style auth
- Adapted for pharmacy ERP (simplified, practical)
- SERIAL primary keys (simple, fast)
- Operational schema (smart separation)
- Transaction-safe operations
- Soft delete with audit trail
- Email verification ready
- OAuth/SSO ready

**What's Optional:**
- Channels (only if multiple pharmacies)
- Anonymous sessions (not needed for ERP)
- Audit logging (add if needed for compliance)
- Pharmacist/Doctor specific data (add in separate tables when needed)

**Time Estimate:**
- Phase 1 (Core Auth): 1-2 days
- Phase 2 (Roles/Permissions): 1 day
- Phase 3 (Enhancements): As needed

Good luck with your implementation! 🚀
