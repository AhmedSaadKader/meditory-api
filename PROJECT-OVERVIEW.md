# Meditory API - Comprehensive Project Overview

## Executive Summary

**Meditory API** is a comprehensive, enterprise-grade **ERP system for pharmacies** built with NestJS and PostgreSQL. The architecture draws inspiration from two major open-source ERP systems: **Vendure** (for e-commerce patterns) and **ERPNext** (for business logic and workflows). This project demonstrates sophisticated software engineering practices, domain-driven design, and production-ready patterns suitable for healthcare/pharmaceutical operations.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Architecture Overview](#architecture-overview)
3. [Core Modules & Features](#core-modules--features)
4. [Design Patterns & Techniques](#design-patterns--techniques)
5. [Database Design](#database-design)
6. [API Architecture](#api-architecture)
7. [Security Features](#security-features)
8. [Business Logic Highlights](#business-logic-highlights)
9. [Testing & Quality Assurance](#testing--quality-assurance)
10. [Deployment & DevOps](#deployment--devops)
11. [CV/Resume Highlights](#cvresume-highlights)
12. [**Learning Resources & Deep Dive Guide**](#learning-resources--deep-dive-guide) 🎓

---

## Technology Stack

### Backend Framework
- **NestJS 11** - Enterprise Node.js framework with dependency injection
- **TypeScript 5.7** - Strict typing with modern ES2023 target
- **Node.js** - Runtime environment

### Database & ORM
- **PostgreSQL** - Primary RDBMS with advanced features
- **TypeORM 0.3** - Entity management, migrations, query builder
- **Database Functions** - Custom PostgreSQL functions for complex queries
- **Multi-schema Design** - Separation of operational and reference data

### Authentication & Security
- **bcrypt** - Password hashing (with salt rounds)
- **Session-based Authentication** - Cookie sessions with token validation
- **Custom RBAC** - Role-Based Access Control with permissions
- **Multi-tenancy** - Organization-level data isolation

### Data Validation & Transformation
- **class-validator** - DTO validation with decorators
- **class-transformer** - Object serialization/deserialization
- **nestjs-paginate** - Advanced pagination with filtering

### Email & Notifications
- **@nestjs-modules/mailer** - Email template engine
- **Resend** - Modern email delivery service
- **nodemailer** - SMTP support

### API Documentation
- **@nestjs/swagger** - OpenAPI 3.0 specification auto-generation
- **Type-safe DTOs** - Automatic schema generation from TypeScript types

### Development Tools
- **ESLint** - Code quality and consistency
- **Prettier** - Code formatting
- **Jest** - Unit and integration testing framework
- **Faker.js** - Test data generation
- **TypeORM CLI** - Database migration management

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         API Layer                            │
│  (Controllers + Swagger + DTOs + Validation)                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    Guard Layer                               │
│  (AuthGuard + Permission Check + RequestContext)             │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                   Service Layer                              │
│  (Business Logic + Transactions + Validation)                │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              Repository/Strategy Layer                       │
│  (TypeORM Repositories + Strategy Patterns)                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                  Database Layer                              │
│  (PostgreSQL + Functions + Views + Triggers)                 │
└─────────────────────────────────────────────────────────────┘
```

### Module Structure

- **AuthModule** - Authentication, authorization, users, roles, organizations
- **DrugsModule** - Drug catalog, reference data, search functionality
- **InventoryModule** - Pharmacy management, stock operations
- **PurchaseModule** - Purchase orders, receipts, suppliers
- **SalesModule** - Customer management, sales operations

---

## Core Modules & Features

### 1. Authentication & Authorization Module

#### Features Implemented:
✅ **Multi-strategy Authentication System**
- Native authentication (username/password)
- External authentication ready (OAuth, SAML)
- Strategy pattern for extensible auth methods

✅ **Session Management**
- Database-persisted sessions
- In-memory LRU cache with configurable max size (10,000 sessions)
- Redis-ready strategy for distributed systems
- Token-based session validation
- Cookie and Bearer token support

✅ **Role-Based Access Control (RBAC)**
- Custom permission enumeration system
- Role-to-permission mapping
- User-to-role many-to-many relationships
- System roles (protected) vs custom roles
- Pharmacy-level role scoping

✅ **Multi-tenancy Support**
- Organization entity as tenant boundary
- Organization-scoped data isolation
- Platform SuperAdmin role (cross-organization access)
- RequestContext pattern for tenant awareness

✅ **User Management**
- User registration with email verification
- Password reset flow
- Soft delete support
- Last login tracking
- Audit logging for critical operations

✅ **Advanced Guard System**
- Global AuthGuard with @Public() decorator bypass
- @Allow(Permission.X) decorator for fine-grained control
- RequestContext injection in every request
- Owner permission for resource-specific access

#### Key Files:
- [auth.guard.ts](src/auth/guards/auth.guard.ts) - Main authentication guard
- [session.service.ts](src/auth/services/session.service.ts) - Session management
- [native-authentication.strategy.ts](src/auth/strategies/native-authentication.strategy.ts) - Password auth
- [in-memory-session-cache.strategy.ts](src/auth/strategies/in-memory-session-cache.strategy.ts) - LRU cache
- [request-context.ts](src/auth/types/request-context.ts) - Request context pattern

---

### 2. Drugs & Reference Data Module

#### Features Implemented:
✅ **Comprehensive Drug Catalog**
- 60,000+ drugs in reference database
- Drug names, companies, prices
- Dosage forms (tablets, capsules, syrups, etc.)
- Routes of administration (oral, IV, topical, etc.)
- Ingredient composition

✅ **Advanced Search System**
- **Hierarchical ingredient search** - Search by standard terms, synonyms, or ingredient groups
- **Unified search** - Single search across drug names and ingredients
- **Advanced search** - Separate drug name AND ingredient filters
- **Wildcard support** - User-friendly `*` (any chars) and `?` (single char)
- **PostgreSQL function-based** - Custom database functions for performance

✅ **Ingredient Normalization**
- Standard ingredient terms (e.g., "paracetamol")
- Synonym mapping (e.g., "acetaminophen" → "paracetamol")
- Ingredient groups (e.g., "Vitamins", "Antibiotics")
- Multi-ingredient support

✅ **Reference Data Management**
- Dosage forms with standardization
- Routes with standardization
- Therapeutic categories
- Company/manufacturer data

✅ **Pagination & Filtering**
- nestjs-paginate integration
- Filter by dosage form, route, price range
- Sort by multiple fields
- Configurable page sizes

#### Key Files:
- [drugs.service.ts](src/drugs/drugs.service.ts) - Search implementation
- [reference-data.service.ts](src/drugs/reference-data.service.ts) - Reference data
- [drug.entity.ts](src/drugs/entities/drug.entity.ts) - Drug entity

---

### 3. Inventory & Stock Management Module

#### Features Implemented:
✅ **Multi-pharmacy Support**
- Organization can have multiple pharmacies
- Pharmacy-level stock tracking
- Inter-pharmacy stock transfers
- User access control per pharmacy

✅ **Batch & Lot Management**
- Batch number tracking
- Expiry date management
- Cost price and selling price per batch
- Supplier information per batch

✅ **Stock Operations** (ERPNext-inspired)
- **Receive Stock** - Purchase receiving with batch creation
- **Dispense Stock** - FEFO (First Expiry First Out) logic
- **Transfer Stock** - Between pharmacies with dual movements
- **Adjust Stock** - Manual corrections with reason tracking
- **Allocate Stock** - Reserve stock for orders
- **Release Stock** - Un-reserve allocated stock
- **Remove Expired Stock** - Automatic expiry handling

✅ **Stock Movement Ledger** (ERPNext pattern)
- Complete audit trail of all stock movements
- Movement types: PURCHASE, SALE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT, ALLOCATION, RELEASE, EXPIRY
- Balance tracking after each movement
- Reference type and number for traceability
- Metadata field for additional context

✅ **Stock Valuation** (ERPNext-inspired)
- Valuation rate tracking (cost price)
- Stock value calculation per movement
- Stock value difference tracking
- Fiscal year and period tracking
- Posting date/time for accounting

✅ **Advanced Stock Queries**
- Low stock alerts (below minimum level)
- Expiring stock (configurable threshold)
- Stock valuation reports (profit margin analysis)
- Stock reconciliation (ledger vs state verification)

✅ **Concurrency Control**
- Pessimistic locking for stock operations
- Transaction-based operations
- Allocated quantity separate from physical quantity

#### Key Files:
- [stock.service.ts](src/inventory/stock/stock.service.ts) - 1,200+ lines of stock logic
- [pharmacy-stock.entity.ts](src/inventory/entities/pharmacy-stock.entity.ts) - Stock state
- [stock-movement.entity.ts](src/inventory/entities/stock-movement.entity.ts) - Movement ledger

---

### 4. Purchase Management Module (ERPNext-inspired)

#### Features Implemented:
✅ **Purchase Order Workflow**
- **Draft** → **Submitted** → **Partially Received** → **Received** → **Completed**
- State machine validation for transitions
- Only drafts can be edited or deleted
- Document status tracking (0=Draft, 1=Submitted, 2=Cancelled)

✅ **Purchase Order Features**
- Organization-scoped PO codes
- Supplier linkage
- Multiple line items with tax calculation
- Target pharmacy for delivery
- Expected delivery dates (order and item level)
- Terms and conditions
- Approval workflow ready

✅ **Purchase Receipt**
- Linked to purchase orders
- Partial receiving support
- Automatic received percentage calculation
- Batch number capture
- Quality inspection ready

✅ **Supplier Management**
- Supplier profiles
- Contact information
- Payment terms
- Tax details
- Organization-scoped

✅ **UOM (Unit of Measurement) Support**
- Multiple UOMs per item (Box, Strip, Unit)
- Conversion factors
- Stock UOM standardization

#### Key Files:
- [purchase-order.service.ts](src/purchase/services/purchase-order.service.ts) - PO workflow
- [purchase-order.entity.ts](src/purchase/entities/purchase-order.entity.ts) - ERPNext mapping
- [purchase-receipt.service.ts](src/purchase/services/purchase-receipt.service.ts) - Receipt handling

---

### 5. Sales Management Module

#### Features Implemented:
✅ **Customer Management**
- Customer profiles
- Organization-scoped
- Contact information
- Credit limit tracking (ready)

---

## Design Patterns & Techniques

### 1. **Strategy Pattern**
- **Authentication strategies** - Pluggable auth methods (Native, OAuth, etc.)
- **Session cache strategies** - In-memory vs Redis
- Allows runtime switching based on configuration

**Example:** [native-authentication.strategy.ts](src/auth/strategies/native-authentication.strategy.ts)

### 2. **Repository Pattern**
- TypeORM repositories for data access
- Service layer abstracts database operations
- Testable business logic

### 3. **Decorator Pattern**
- **@Public()** - Mark routes as publicly accessible
- **@Allow(Permission.X)** - Permission-based access control
- **@Ctx()** - Inject RequestContext into controllers
- Custom parameter decorators for clean code

**Example:** [allow.decorator.ts](src/auth/decorators/allow.decorator.ts)

### 4. **Factory Pattern**
- Session cache strategy factory
- Dynamic strategy selection based on environment

**Example:** [auth.module.ts](src/auth/auth.module.ts:54-63)

### 5. **Guard Pattern**
- Global authentication guard
- Centralized authorization logic
- Request context creation

**Example:** [auth.guard.ts](src/auth/guards/auth.guard.ts)

### 6. **DTO (Data Transfer Object) Pattern**
- Input validation with class-validator
- Type safety across API boundaries
- Auto-generated Swagger documentation
- Separate Create/Update DTOs

### 7. **Unit of Work Pattern**
- TypeORM transactions for atomic operations
- Rollback on failure
- Data consistency guarantees

**Example:** Stock operations in [stock.service.ts](src/inventory/stock/stock.service.ts:128)

### 8. **Table Inheritance Pattern**
- AuthenticationMethod base class
- Native vs External auth methods
- TypeORM discriminator column

**Example:** [authentication-method.entity.ts](src/auth/entities/authentication-method.entity.ts)

### 9. **Soft Delete Pattern**
- Users have deletedAt timestamp
- Queries filter out deleted records
- Restore functionality

**Example:** [user.entity.ts](src/auth/entities/user.entity.ts:82-92)

### 10. **Request Context Pattern** (Vendure-inspired)
- Encapsulates user, session, permissions, organization
- Passed through request pipeline
- Multi-tenancy support

**Example:** RequestContext in auth guard

### 11. **Fiscal Period Tracking** (ERPNext-inspired)
- Automatic fiscal year calculation
- Fiscal period (quarter) tracking
- Accounting-ready stock movements

**Example:** [stock.service.ts](src/inventory/stock/stock.service.ts:41-85)

### 12. **Ledger-Based Inventory** (ERPNext pattern)
- Every stock change creates a movement record
- Balance calculation from movements
- Reconciliation support
- Audit trail

---

## Database Design

### Schema Organization
- **operational** schema - Transactional data (users, orders, stock)
- **reference** schema - Master data (drugs, ingredients, dosage forms)

### Key Entity Relationships

```
Organization (Tenant)
├── Users (many)
│   ├── Roles (many-to-many)
│   ├── Sessions (many)
│   └── AuthenticationMethods (many)
├── Pharmacies (many)
│   ├── PharmacyStock (many)
│   └── StockMovements (many)
├── Roles (many)
│   └── Pharmacies (many-to-many) - Pharmacy-scoped roles
├── PurchaseOrders (many)
│   └── PurchaseOrderItems (many)
├── PurchaseReceipts (many)
│   └── PurchaseReceiptItems (many)
└── Suppliers (many)

Drug (Reference Data)
├── Ingredients (many-to-many via normalized tables)
├── DosageForm (many-to-one)
└── Route (many-to-one)
```

### Advanced Database Features

✅ **Custom PostgreSQL Functions**
- `find_drugs_hierarchical()` - Ingredient search with synonym expansion
- `find_drugs_unified()` - Combined drug name + ingredient search
- `find_drugs_advanced()` - Multi-criteria search

✅ **Materialized Views**
- `drug_ingredient_search_v2` - Denormalized search view

✅ **Indexes**
- Composite indexes for organization + code uniqueness
- Query optimization for search operations
- Foreign key indexes

✅ **TypeORM Migrations**
- Version-controlled schema changes
- Migration scripts for deployment

---

## API Architecture

### RESTful Design
- Resource-based URLs
- HTTP verbs (GET, POST, PUT, PATCH, DELETE)
- Proper status codes

### Request/Response Flow

```
1. HTTP Request
   ↓
2. Global AuthGuard
   - Extract session token
   - Validate session
   - Create RequestContext
   - Check permissions
   ↓
3. Controller
   - DTO validation
   - Extract RequestContext with @Ctx()
   ↓
4. Service
   - Business logic
   - Validation
   - Database transactions
   ↓
5. Repository/TypeORM
   - Database operations
   ↓
6. Response
   - Serialized DTOs
   - Status codes
```

### API Features

✅ **Swagger/OpenAPI Documentation**
- Auto-generated from TypeScript types
- Interactive API explorer
- Schema validation

✅ **CORS Support**
- Configurable origins
- Credentials support

✅ **Error Handling**
- Standardized error responses
- HTTP exception filters
- Validation error formatting

✅ **Pagination**
- nestjs-paginate integration
- Configurable page sizes
- Total count tracking
- Filtering and sorting

---

## Security Features

### 1. **Authentication**
- Session-based with secure tokens
- Password hashing with bcrypt (10 salt rounds)
- Token validation on every request
- Session expiry management

### 2. **Authorization**
- Permission-based access control
- Organization-level data isolation
- Pharmacy-level access control
- Owner-based permissions

### 3. **Input Validation**
- DTO validation with class-validator
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)

### 4. **Data Protection**
- Soft delete for users
- Audit logging for critical actions
- Password never returned in API responses

### 5. **Multi-tenancy Security**
- Organization ID in every query
- Platform SuperAdmin bypass
- Pharmacy access verification

### 6. **Session Security**
- LRU eviction for memory management
- Session invalidation on logout
- Token-based session lookup

---

## Business Logic Highlights

### 1. **FEFO (First Expiry First Out)**
- Automatic batch selection for dispensing
- Prevents expired stock usage
- Configurable expiry threshold

### 2. **Stock Valuation**
- Moving average cost calculation
- Profit margin analysis
- Stock value reports

### 3. **Purchase Order Workflow**
- State machine for status transitions
- Partial receiving support
- Automatic status updates

### 4. **Stock Reconciliation**
- Compare ledger balance vs physical stock
- Automatic adjustment creation
- Discrepancy reporting

### 5. **Fiscal Period Tracking**
- Automatic fiscal year calculation (April-March)
- Quarterly periods
- Accounting-ready data

---

## Testing & Quality Assurance

### Testing Setup
- **Jest** configured for unit and integration tests
- **Faker.js** for test data generation
- **Supertest** for E2E API testing
- Test coverage reporting

### Code Quality
- **ESLint** with TypeScript rules
- **Prettier** for consistent formatting
- Strict TypeScript configuration
- Pre-commit hooks ready

---

## Deployment & DevOps

### Environment Configuration
- **@nestjs/config** for environment variables
- Database connection configuration
- SSL support for production
- Email service configuration

### Database Migrations
- TypeORM migration commands
- Version-controlled schema changes
- `migration:generate` and `migration:run` scripts

### Production Deployment
- Build script (`npm run build`)
- Production start script
- Environment-based configuration
- SSL/TLS support

### Scalability Features
- Redis-ready session caching
- Database connection pooling
- Stateless API design
- Multi-instance ready

---

## CV/Resume Highlights

### Technical Skills Demonstrated

#### Backend Development
- **NestJS** - Enterprise Node.js framework with DI
- **TypeScript** - Advanced types, decorators, interfaces
- **RESTful API Design** - Resource-based, standard HTTP methods
- **PostgreSQL** - Complex queries, functions, views, transactions
- **TypeORM** - Migrations, query builder, repository pattern

#### Software Architecture
- **Multi-tenancy** - Organization-based data isolation
- **RBAC** - Role-based access control with permissions
- **Strategy Pattern** - Pluggable authentication and caching
- **Repository Pattern** - Data access abstraction
- **Guard Pattern** - Centralized security
- **Decorator Pattern** - Custom decorators for DX

#### Domain-Driven Design
- **Entities** - Rich domain models with business logic
- **Value Objects** - DTOs with validation
- **Aggregates** - PurchaseOrder with items
- **Domain Events** - Ready for event-driven architecture

#### Database Design
- **Multi-schema** - Separation of concerns
- **Custom Functions** - PostgreSQL stored procedures
- **Materialized Views** - Performance optimization
- **Table Inheritance** - OOP in database
- **Indexing Strategy** - Query optimization

#### Security
- **Authentication** - Multi-strategy with sessions
- **Authorization** - Permission-based with RBAC
- **Data Protection** - Soft delete, audit logging
- **Input Validation** - DTO validation with decorators
- **SQL Injection Prevention** - Parameterized queries

#### Business Logic
- **ERP Workflows** - Draft → Submit → Approve patterns
- **Inventory Management** - Stock movements, FEFO, valuation
- **Purchase Management** - PO workflow, partial receiving
- **Fiscal Tracking** - Accounting-ready stock operations

#### API Development
- **Swagger/OpenAPI** - Auto-generated documentation
- **Pagination** - nestjs-paginate integration
- **Error Handling** - Standardized responses
- **Validation** - class-validator decorators
- **CORS** - Cross-origin resource sharing

#### Testing & Quality
- **Jest** - Unit and integration testing
- **E2E Testing** - API endpoint testing
- **Code Quality** - ESLint, Prettier
- **Test Data** - Faker.js integration

### Project Achievements

1. **Built a production-ready pharmacy ERP system** from scratch
2. **Implemented complex inventory management** with FEFO, stock valuation, and fiscal tracking
3. **Designed and implemented multi-tenancy** with organization-level isolation
4. **Created sophisticated RBAC system** with permission-based access control
5. **Developed advanced search functionality** with PostgreSQL functions and wildcard support
6. **Implemented ERPNext-inspired purchase workflow** with state machines
7. **Built scalable session management** with strategy pattern for caching
8. **Designed and implemented ledger-based inventory** for complete audit trail
9. **Created comprehensive API** with Swagger documentation
10. **Managed 60,000+ drugs** reference database with normalization

### Keywords for ATS (Applicant Tracking Systems)

**Languages & Frameworks:**
TypeScript, JavaScript, Node.js, NestJS, Express

**Databases:**
PostgreSQL, SQL, TypeORM, Database Design, Migrations, Stored Procedures

**Architecture & Patterns:**
Microservices, REST API, Design Patterns, Multi-tenancy, RBAC, Strategy Pattern, Repository Pattern, Factory Pattern, Decorator Pattern, Domain-Driven Design, Clean Architecture

**Security:**
Authentication, Authorization, JWT, Sessions, bcrypt, CORS, Input Validation, SQL Injection Prevention

**Testing:**
Jest, Unit Testing, Integration Testing, E2E Testing, Test-Driven Development

**DevOps:**
Git, Environment Configuration, Deployment, Database Migrations

**Domain Knowledge:**
ERP Systems, Inventory Management, Purchase Management, Stock Valuation, Healthcare IT, Pharmacy Systems

**Tools & Libraries:**
Swagger, OpenAPI, class-validator, class-transformer, ESLint, Prettier

**Concepts:**
Transaction Management, Concurrency Control, Caching, Performance Optimization, API Documentation, Pagination, Search Optimization, Data Validation

---

## Conclusion

This project demonstrates **enterprise-level software engineering** with patterns and practices from established ERP systems (Vendure, ERPNext). It showcases:

- ✅ **Full-stack backend expertise** - NestJS, TypeScript, PostgreSQL
- ✅ **Production-ready architecture** - Multi-tenancy, RBAC, transactions
- ✅ **Complex business logic** - Inventory, purchasing, stock valuation
- ✅ **Scalable design** - Strategy patterns, caching, stateless
- ✅ **Security best practices** - Authentication, authorization, validation
- ✅ **Database expertise** - Functions, views, migrations, optimization
- ✅ **API design** - RESTful, documented, validated
- ✅ **Code quality** - TypeScript, linting, testing setup

**Perfect for showcasing in:**
- Backend Developer positions
- Full-stack Developer roles
- Software Architect positions
- ERP/Healthcare IT roles
- Senior Developer positions

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation
```bash
npm install
```

### Environment Setup
Create `.env` file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=meditory
DB_SYNCHRONIZE=false
DB_SSL=false
```

### Database Setup
```bash
npm run migration:run
```

### Running the Application
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### API Documentation
Visit `http://localhost:3000/api` for Swagger UI

---

## Learning Resources & Deep Dive Guide

This section provides comprehensive references to understand every advanced technique, pattern, and concept used in this project. Study these in order for maximum learning impact.

---

### 🎯 Phase 1: Foundation Concepts (Week 1-2)

#### 1.1 NestJS Fundamentals
**Your Code:**
- [app.module.ts](src/app.module.ts) - Module structure
- [auth.module.ts](src/auth/auth.module.ts) - Dependency injection patterns

**Official Docs:**
- [NestJS Overview](https://docs.nestjs.com/first-steps)
- [NestJS Modules](https://docs.nestjs.com/modules)
- [Dependency Injection](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS Guards](https://docs.nestjs.com/guards)

**Deep Dive:**
- 📖 **Book:** "NestJS: A Progressive Node.js Framework" - study chapters on DI container
- 🎥 **Video:** [NestJS Course for Beginners](https://www.youtube.com/watch?v=GHTA143_b-s) by freeCodeCamp

---

#### 1.2 TypeORM & Database Patterns
**Your Code:**
- [user.entity.ts](src/auth/entities/user.entity.ts) - Entity decorators
- [app.module.ts](src/app.module.ts:51-100) - TypeORM configuration
- [stock.service.ts](src/inventory/stock/stock.service.ts:128) - Transaction pattern

**Official Docs:**
- [TypeORM Entities](https://typeorm.io/entities)
- [TypeORM Relations](https://typeorm.io/relations)
- [TypeORM Transactions](https://typeorm.io/transactions)
- [TypeORM Migrations](https://typeorm.io/migrations)

**PostgreSQL Specific:**
- [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [Isolation Levels](https://www.postgresql.org/docs/current/transaction-iso.html)

**Deep Dive:**
- 📖 Study "PostgreSQL: Up and Running" - Chapter 5 (Transactions)
- 🔗 [Martin Fowler - Patterns of Enterprise Application Architecture](https://martinfowler.com/eaaCatalog/) (Repository pattern)

---

### 🔐 Phase 2: Authentication & Security Patterns (Week 2-3)

#### 2.1 Request Context Pattern (Vendure-inspired)
**Your Code:**
- [request-context.ts](src/auth/types/request-context.ts) - Core pattern implementation
- [auth.guard.ts](src/auth/guards/auth.guard.ts:59-68) - Context creation
- [stock.service.ts](src/inventory/stock/stock.service.ts:90-122) - Context usage

**Vendure Reference:**
- [Vendure RequestContext Source](https://github.com/vendure-ecommerce/vendure/blob/master/packages/core/src/api/common/request-context.ts)
- [Vendure Request Context Strategy](https://github.com/vendure-ecommerce/vendure/blob/master/packages/core/src/api/common/request-context-cache.service.ts)

**Pattern Explanation:**
The RequestContext pattern encapsulates request-scoped data (user, session, permissions, organization) and passes it through the entire request lifecycle. This enables:
- Multi-tenancy without global state
- Permission checking at any layer
- Audit trail tracking
- Clean separation of concerns

**Learning Resources:**
- 📖 [Context Object Pattern](https://www.dre.vanderbilt.edu/~schmidt/PDF/Context-Object-Pattern.pdf)
- 🔗 [Vendure Docs - Request Context](https://docs.vendure.io/guides/developer-guide/plugins/#working-with-requestcontext)

**Deep Dive Exercise:**
1. Trace a request from [stock.controller.ts](src/inventory/stock/stock.controller.ts) through the guard to service
2. Notice how `@Ctx()` decorator extracts context
3. See how `verifyPharmacyAccess()` uses context for security

---

#### 2.2 Strategy Pattern for Authentication
**Your Code:**
- [authentication-strategy.interface.ts](src/auth/strategies/authentication-strategy.interface.ts) - Strategy interface
- [native-authentication.strategy.ts](src/auth/strategies/native-authentication.strategy.ts) - Concrete implementation
- [auth.module.ts](src/auth/auth.module.ts:52-63) - Factory pattern for strategies

**Design Pattern Reference:**
- 📖 "Design Patterns: Elements of Reusable Object-Oriented Software" (Gang of Four) - Chapter on Strategy Pattern
- 🔗 [Refactoring Guru - Strategy Pattern](https://refactoring.guru/design-patterns/strategy)

**Vendure Reference:**
- [Vendure Authentication Strategies](https://github.com/vendure-ecommerce/vendure/tree/master/packages/core/src/config/auth)

**Why This Matters:**
- Enables OAuth, SAML, LDAP without changing core auth logic
- Open-closed principle (open for extension, closed for modification)
- Testable in isolation

**Deep Dive Exercise:**
1. Study how [auth.service.ts](src/auth/services/auth.service.ts) uses the strategy
2. Try implementing a mock OAuth strategy
3. Compare with [Passport.js Strategy Pattern](http://www.passportjs.org/docs/)

---

#### 2.3 Session Caching with LRU Eviction
**Your Code:**
- [in-memory-session-cache.strategy.ts](src/auth/strategies/in-memory-session-cache.strategy.ts) - LRU implementation
- [session-cache-strategy.interface.ts](src/auth/strategies/session-cache-strategy.interface.ts) - Cache interface
- [redis-session-cache.strategy.ts](src/auth/strategies/redis-session-cache.strategy.ts) - Redis alternative

**Algorithm Explanation:**
LRU (Least Recently Used) cache evicts oldest items when capacity is reached. In our implementation:
1. Map maintains insertion order in JavaScript
2. On `get()`: delete + re-insert moves item to end (most recent)
3. On `set()`: if full, delete first entry (oldest)

**Learning Resources:**
- 🔗 [LRU Cache Implementation](https://www.interviewcake.com/concept/java/lru-cache)
- 📖 [Redis in Action](https://www.manning.com/books/redis-in-action) - Chapter 2 (Caching)
- 🎥 [LeetCode 146: LRU Cache](https://www.youtube.com/watch?v=7ABFKPK2hD4)

**Vendure Reference:**
- [Vendure Session Cache](https://github.com/vendure-ecommerce/vendure/blob/master/packages/core/src/config/session-cache/in-memory-session-cache-strategy.ts)

**Deep Dive Exercise:**
1. Add logging to see eviction in action
2. Test with session creation under load
3. Implement Redis strategy for production

---

### 📦 Phase 3: Inventory & Concurrency Control (Week 3-4)

#### 3.1 Pessimistic Locking (Critical for Stock Management)
**Your Code:**
- [stock.service.ts](src/inventory/stock/stock.service.ts:262-272) - `setLock('pessimistic_write')`
- [stock.service.ts](src/inventory/stock/stock.service.ts:838-847) - Allocation with locking

**What is Pessimistic Locking?**
When reading rows for update, lock them immediately to prevent other transactions from reading or modifying until your transaction completes. This prevents race conditions in high-concurrency scenarios.

**Without Locking (PROBLEM):**
```
Transaction A: Read stock = 100
Transaction B: Read stock = 100  ← Both see 100!
Transaction A: Deduct 50, save 50
Transaction B: Deduct 60, save 40  ← Lost update! Should be -10
```

**With Pessimistic Locking (SOLUTION):**
```
Transaction A: SELECT ... FOR UPDATE (locks row)
Transaction B: SELECT ... FOR UPDATE (waits...)
Transaction A: Deduct 50, save 50, COMMIT (releases lock)
Transaction B: Now reads 50, deducts 60 → throws error (insufficient stock)
```

**Learning Resources:**
- 🔗 [PostgreSQL SELECT FOR UPDATE](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
- 📖 [Designing Data-Intensive Applications](https://dataintensive.net/) by Martin Kleppmann - Chapter 7 (Transactions)
- 🔗 [TypeORM Pessimistic Locking](https://typeorm.io/select-query-builder#locking)

**Database Concepts:**
- **FOR UPDATE** - Exclusive lock (prevents reads/writes)
- **FOR SHARE** - Shared lock (prevents writes only)
- **NOWAIT** - Fail immediately if locked
- **SKIP LOCKED** - Skip locked rows (for queues)

**Deep Dive Exercise:**
1. Remove `setLock()` from [stock.service.ts](src/inventory/stock/stock.service.ts:264)
2. Run concurrent dispense operations (use Postman runner)
3. Observe negative stock (race condition)
4. Re-add locking and verify correctness

**Further Reading:**
- 🔗 [Two-Phase Locking (2PL)](https://en.wikipedia.org/wiki/Two-phase_locking)
- 🔗 [Optimistic vs Pessimistic Locking](https://stackoverflow.com/questions/129329/optimistic-vs-pessimistic-locking)

---

#### 3.2 FEFO (First Expiry First Out) Logic
**Your Code:**
- [stock.service.ts](src/inventory/stock/stock.service.ts:262-272) - FEFO query
- [stock.service.ts](src/inventory/stock/stock.service.ts:300-360) - Batch deduction loop

**Algorithm Explanation:**
1. Query batches ordered by expiry date ASC
2. Filter out expired and quarantined
3. Deduct from earliest expiring batch first
4. If batch depleted, move to next
5. Continue until quantity fulfilled

**Why FEFO?**
- Prevents expired stock from accumulating
- Regulatory compliance in healthcare
- Reduces waste from expiry

**Alternative Strategies:**
- **FIFO** (First In First Out) - Order by received_date
- **LIFO** (Last In First Out) - Reverse order
- **Weighted Average** - Blend batches

**Learning Resources:**
- 🔗 [Inventory Management Methods](https://www.investopedia.com/terms/f/fifo.asp)
- 📖 ERPNext documentation - [Stock Movement](https://docs.erpnext.com/docs/v13/user/manual/en/stock)

**Deep Dive Exercise:**
1. Modify [stock.service.ts](src/inventory/stock/stock.service.ts:271) to use FIFO
2. Test expiry handling with various scenarios
3. Implement a hybrid strategy (FEFO for near-expiry, FIFO otherwise)

---

#### 3.3 Stock Ledger Pattern (ERPNext-inspired)
**Your Code:**
- [stock-movement.entity.ts](src/inventory/entities/stock-movement.entity.ts) - Movement ledger
- [stock.service.ts](src/inventory/stock/stock.service.ts:220-241) - Movement creation
- [stock.service.ts](src/inventory/stock/stock.service.ts:1055-1165) - Reconciliation

**ERPNext Reference:**
- [ERPNext Stock Ledger Entry](https://github.com/frappe/erpnext/blob/develop/erpnext/stock/doctype/stock_ledger_entry/stock_ledger_entry.py)
- [ERPNext Stock Controller](https://github.com/frappe/erpnext/blob/develop/erpnext/controllers/stock_controller.py)

**Pattern Explanation:**
Instead of just updating stock quantity, create an immutable ledger entry for every movement. Benefits:
- **Complete audit trail** - Who, what, when, why
- **Balance reconstruction** - Sum movements to get current state
- **Reconciliation** - Compare ledger vs physical count
- **Valuation tracking** - Cost basis for accounting
- **Time-travel queries** - Stock level at any point in history

**Ledger Entry Anatomy:**
```typescript
{
  type: 'PURCHASE',           // Movement type
  quantity: +100,              // Positive = incoming
  balanceAfter: 250,           // Running balance
  valuationRate: 10.50,        // Cost per unit
  stockValue: 2625.00,         // Total value (250 * 10.50)
  stockValueDifference: 1050,  // Change from this movement
  fiscalYear: '2025-2026',     // For accounting
  referenceType: 'PO-001'      // Traceback to source document
}
```

**Learning Resources:**
- 📖 [Double-Entry Bookkeeping](https://en.wikipedia.org/wiki/Double-entry_bookkeeping) - Same principle
- 🔗 [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html) by Martin Fowler
- 🔗 [ERPNext Docs - Stock Reconciliation](https://docs.erpnext.com/docs/v13/user/manual/en/stock/stock-reconciliation)

**Deep Dive Exercise:**
1. Run [stock.service.ts](src/inventory/stock/stock.service.ts:1055) reconciliation
2. Manually corrupt stock quantity in database
3. Run reconciliation again to see auto-fix
4. Query movements to reconstruct stock history

---

#### 3.4 Stock Valuation & Moving Average Cost
**Your Code:**
- [stock.service.ts](src/inventory/stock/stock.service.ts:193-215) - Valuation calculation
- [stock.service.ts](src/inventory/stock/stock.service.ts:1170-1242) - Valuation report

**ERPNext Reference:**
- [ERPNext Stock Valuation](https://github.com/frappe/erpnext/blob/develop/erpnext/stock/stock_ledger.py#L200)
- [ERPNext Stock Balance Report](https://github.com/frappe/erpnext/blob/develop/erpnext/stock/report/stock_balance/stock_balance.py)

**Formula:**
```
New Stock Value = Previous Stock Value + Stock Value Difference

Stock Value Difference = Quantity Change × Valuation Rate

For incoming:  +100 units × $10 = +$1000
For outgoing:  -50 units × $10 = -$500
```

**Moving Average Cost (for future implementation):**
```
New Avg Cost = (Old Value + Purchase Value) / (Old Qty + Purchase Qty)

Example:
Current: 100 units @ $10 = $1000
Purchase: 50 units @ $12 = $600
New Avg: $1600 / 150 = $10.67 per unit
```

**Learning Resources:**
- 🔗 [Inventory Valuation Methods](https://www.investopedia.com/terms/i/inventory-valuation.asp)
- 📖 [Financial Accounting Basics](https://www.accountingtools.com/articles/inventory-valuation.html)
- 🔗 [FIFO vs LIFO vs Weighted Average](https://www.wallstreetmojo.com/fifo-vs-lifo/)

**Deep Dive Exercise:**
1. Add purchase with different cost prices
2. Run valuation report [stock.service.ts](src/inventory/stock/stock.service.ts:1170)
3. Calculate profit margins per batch
4. Implement moving average cost method

---

### 🛒 Phase 4: Purchase Workflow & State Machines (Week 4-5)

#### 4.1 ERPNext Document Workflow Pattern
**Your Code:**
- [purchase-order.entity.ts](src/purchase/entities/purchase-order.entity.ts:18-26) - Status enum
- [purchase-order.service.ts](src/purchase/services/purchase-order.service.ts:301-336) - State transitions
- [purchase-order.service.ts](src/purchase/services/purchase-order.service.ts:252-296) - Status update

**ERPNext Reference:**
- [ERPNext Purchase Order](https://github.com/frappe/erpnext/blob/develop/erpnext/buying/doctype/purchase_order/purchase_order.py)
- [ERPNext Workflow State](https://docs.erpnext.com/docs/v13/user/manual/en/setting-up/workflows)
- [ERPNext DocStatus](https://frappeframework.com/docs/v14/user/en/desk/docstatus)

**State Machine:**
```
DRAFT ──submit──> SUBMITTED ──receive──> PARTIALLY_RECEIVED
  │                   │                          │
  │                   └─────receive all─────────┴──> RECEIVED ──> COMPLETED
  │                   │                                  │
  └──────cancel───────┴──────cancel────────────────────┴──> CANCELLED
                      │
                      └──────close──────────────────────────> CLOSED
```

**DocStatus Mapping:**
- `0` = Draft (editable, deletable)
- `1` = Submitted (immutable, can create receipts)
- `2` = Cancelled (archived)

**Why This Pattern?**
- **Audit compliance** - Cannot modify submitted documents
- **Amendment pattern** - Create new version instead of editing
- **Workflow flexibility** - Add approval stages
- **Data integrity** - Prevent retroactive changes

**Learning Resources:**
- 🔗 [State Machine Pattern](https://refactoring.guru/design-patterns/state)
- 📖 "UML Distilled" by Martin Fowler - Chapter on State Diagrams
- 🔗 [ERPNext Document Lifecycle](https://frappeframework.com/docs/v14/user/en/basics/document-lifecycle)

**Deep Dive Exercise:**
1. Visualize the state machine on paper
2. Try invalid transitions (e.g., DRAFT → RECEIVED)
3. Implement approval workflow (SUBMITTED → APPROVED → RECEIVED)
4. Add amendment feature (create PO-001-1 from PO-001)

---

#### 4.2 Partial Receiving & Percentage Tracking
**Your Code:**
- [purchase-order.service.ts](src/purchase/services/purchase-order.service.ts:342-380) - Update received %
- [purchase-receipt.service.ts](src/purchase/services/purchase-receipt.service.ts) - Receipt creation

**ERPNext Reference:**
- [ERPNext Purchase Receipt](https://github.com/frappe/erpnext/blob/develop/erpnext/stock/doctype/purchase_receipt/purchase_receipt.py)

**Algorithm:**
```typescript
// Calculate percentage across all line items
totalOrdered = sum(item.quantity) for all items
totalReceived = sum(item.receivedQuantity) for all items
receivedPercentage = (totalReceived / totalOrdered) * 100

// Auto-update status
if (receivedPercentage >= 100) status = RECEIVED
else if (receivedPercentage > 0) status = PARTIALLY_RECEIVED
```

**Real-world Scenario:**
```
PO-001: Order 1000 tablets
Receipt-1: Receive 300 (30%)  → Status: PARTIALLY_RECEIVED
Receipt-2: Receive 400 (70%)  → Status: PARTIALLY_RECEIVED
Receipt-3: Receive 300 (100%) → Status: RECEIVED
```

**Deep Dive Exercise:**
1. Create a purchase order with multiple items
2. Create partial receipts
3. Observe status changes
4. Handle over-receiving scenarios

---

### 🎨 Phase 5: Advanced Patterns & Techniques (Week 5-6)

#### 5.1 Decorator Pattern (Custom Decorators)
**Your Code:**
- [allow.decorator.ts](src/auth/decorators/allow.decorator.ts) - Permission decorator
- [public.decorator.ts](src/auth/decorators/public.decorator.ts) - Public route marker
- [ctx.decorator.ts](src/auth/decorators/ctx.decorator.ts) - Context extractor

**NestJS Reference:**
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
- [NestJS Metadata](https://docs.nestjs.com/fundamentals/execution-context#reflection-and-metadata)

**How It Works:**
```typescript
// Decorator stores metadata
export const Allow = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_METADATA_KEY, permissions);

// Guard reads metadata via Reflector
const permissions = this.reflector.get<Permission[]>(
  PERMISSIONS_METADATA_KEY,
  context.getHandler(),
);
```

**Learning Resources:**
- 📖 [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
- 🔗 [Reflect Metadata](https://rbuckton.github.io/reflect-metadata/)

**Deep Dive Exercise:**
1. Create `@RateLimit()` decorator
2. Create `@AuditLog()` decorator for automatic logging
3. Study how decorators compose

---

#### 5.2 Multi-Tenancy with Organization Scoping
**Your Code:**
- [organization.entity.ts](src/auth/entities/organization.entity.ts) - Tenant boundary
- [request-context.ts](src/auth/types/request-context.ts) - Organization context
- [stock.service.ts](src/inventory/stock/stock.service.ts:90-122) - Tenant verification

**Pattern Explanation:**
Every query includes `organizationId` filter to isolate tenant data:
```typescript
where: {
  organizationId: ctx.activeOrganizationId,
  // other filters...
}
```

**Multi-Tenancy Approaches:**
1. **Separate Databases** - Complete isolation, higher cost
2. **Separate Schemas** - Good balance
3. **Shared Schema with Org ID** (Your approach) - Most efficient
4. **Hybrid** - High-value tenants get own schema

**Learning Resources:**
- 📖 [Multi-Tenant Data Architecture](https://docs.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/overview)
- 🔗 [SaaS Tenant Isolation](https://aws.amazon.com/blogs/apn/isolating-saas-tenants-with-dynamically-generated-iam-policies/)

**Vendure Reference:**
- [Vendure Channels](https://github.com/vendure-ecommerce/vendure/blob/master/packages/core/src/entity/channel/channel.entity.ts) - Similar concept

**Deep Dive Exercise:**
1. Try querying without organizationId filter
2. Observe cross-tenant data leak
3. Add database-level Row-Level Security (RLS) in PostgreSQL
4. Implement SuperAdmin bypass logic

---

#### 5.3 Table Inheritance (Single Table Inheritance)
**Your Code:**
- [authentication-method.entity.ts](src/auth/entities/authentication-method.entity.ts:11-12) - Base class
- [native-authentication-method.entity.ts](src/auth/entities/native-authentication-method.entity.ts) - Subclass
- [external-authentication-method.entity.ts](src/auth/entities/external-authentication-method.entity.ts) - Subclass

**TypeORM Pattern:**
```typescript
@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class AuthenticationMethod {
  @Column()
  type: string; // Discriminator column
}

@ChildEntity('native')
export class NativeAuthenticationMethod extends AuthenticationMethod {
  @Column()
  passwordHash: string;
}
```

**Database Structure:**
```sql
authentication_methods
  id | type     | user_id | password_hash | provider_token
  ---|----------|---------|---------------|---------------
  1  | native   | 100     | $2b$10...     | NULL
  2  | google   | 101     | NULL          | ya29.a0A...
```

**Learning Resources:**
- 🔗 [TypeORM Inheritance](https://typeorm.io/entity-inheritance)
- 📖 "Patterns of Enterprise Application Architecture" - Single Table Inheritance
- 🔗 [Hibernate Inheritance Strategies](https://www.baeldung.com/hibernate-inheritance)

**Trade-offs:**
- ✅ Single table, no joins needed
- ✅ Polymorphic queries
- ❌ Sparse columns (NULLs for unused fields)
- ❌ Less normalized

**Alternative Patterns:**
- **Class Table Inheritance** - Separate table per subclass
- **Concrete Table Inheritance** - No shared table

---

#### 5.4 DTO Validation Pipeline
**Your Code:**
- [receive-stock.dto.ts](src/inventory/dto/receive-stock.dto.ts) - Validation decorators
- [create-purchase-order.dto.ts](src/purchase/dto/create-purchase-order.dto.ts) - Nested validation

**NestJS Validation:**
```typescript
export class ReceiveStockDto {
  @IsString()
  @IsNotEmpty()
  pharmacyId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsDateString()
  expiryDate: string;

  @IsNumber()
  @Min(0)
  costPrice: number;
}
```

**Pipeline:**
```
Raw JSON → class-transformer → DTO instance → class-validator → Controller
```

**Learning Resources:**
- 🔗 [class-validator](https://github.com/typestack/class-validator)
- 🔗 [class-transformer](https://github.com/typestack/class-transformer)
- 🔗 [NestJS Validation](https://docs.nestjs.com/techniques/validation)

**Advanced Techniques:**
- Custom validators
- Conditional validation
- Transform decorators
- Validation groups

**Deep Dive Exercise:**
1. Add custom validator for batch number format
2. Implement conditional validation (if X then Y required)
3. Create validation pipe with custom error formatting

---

#### 5.5 Database Functions & Views
**Your Code:**
- [drugs.service.ts](src/drugs/drugs.service.ts:104-175) - Uses `find_drugs_hierarchical()`
- PostgreSQL functions in database (not in repo, but called via raw queries)

**PostgreSQL Function Example:**
```sql
CREATE OR REPLACE FUNCTION find_drugs_hierarchical(search_term TEXT)
RETURNS TABLE(drug_name TEXT, standard_term TEXT, match_type TEXT)
AS $$
BEGIN
  RETURN QUERY
  -- Search standard terms
  SELECT d.name, i.standard_term, 'exact'::TEXT
  FROM drugs d
  JOIN drug_ingredients di ON d.id = di.drug_id
  JOIN ingredients i ON di.ingredient_id = i.id
  WHERE LOWER(i.standard_term) = LOWER(search_term)

  UNION

  -- Search synonyms
  SELECT d.name, i.standard_term, 'synonym'::TEXT
  FROM drugs d
  JOIN drug_ingredients di ON d.id = di.drug_id
  JOIN ingredients i ON di.ingredient_id = i.id
  JOIN ingredient_synonyms s ON i.id = s.ingredient_id
  WHERE LOWER(s.synonym_text) = LOWER(search_term);
END;
$$ LANGUAGE plpgsql;
```

**Why Use Database Functions?**
- ✅ Complex queries in one call
- ✅ Better performance (runs in DB)
- ✅ Reusable across applications
- ✅ Encapsulate business logic

**Learning Resources:**
- 🔗 [PostgreSQL Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
- 🔗 [PL/pgSQL Tutorial](https://www.postgresqltutorial.com/postgresql-plpgsql/)
- 📖 "PostgreSQL: Up and Running" - Chapter 8 (Functions)

**Deep Dive Exercise:**
1. Create migration to add database function
2. Test function directly in psql
3. Create TypeORM raw query to call it
4. Compare performance vs multiple queries

---

### 📚 Phase 6: Comparing with Vendure & ERPNext (Week 6-7)

#### 6.1 Vendure Patterns You've Implemented

**Request Context Pattern**
- **Vendure:** [RequestContext](https://github.com/vendure-ecommerce/vendure/blob/master/packages/core/src/api/common/request-context.ts)
- **Your Code:** [request-context.ts](src/auth/types/request-context.ts)
- **Study:** How Vendure passes context through services

**Strategy Pattern for Authentication**
- **Vendure:** [Authentication Strategy](https://github.com/vendure-ecommerce/vendure/tree/master/packages/core/src/config/auth)
- **Your Code:** [native-authentication.strategy.ts](src/auth/strategies/native-authentication.strategy.ts)
- **Study:** Vendure's external auth strategies

**Session Caching**
- **Vendure:** [Session Cache Strategy](https://github.com/vendure-ecommerce/vendure/blob/master/packages/core/src/config/session-cache/in-memory-session-cache-strategy.ts)
- **Your Code:** [in-memory-session-cache.strategy.ts](src/auth/strategies/in-memory-session-cache.strategy.ts)
- **Study:** Vendure's Redis implementation

**Permission System**
- **Vendure:** [Permissions](https://github.com/vendure-ecommerce/vendure/blob/master/packages/core/src/common/generated-types.ts#L1500)
- **Your Code:** [permission.enum.ts](src/auth/enums/permission.enum.ts)
- **Study:** Vendure's permission combinations

**Decorator-based Authorization**
- **Vendure:** [@Allow decorator](https://github.com/vendure-ecommerce/vendure/blob/master/packages/core/src/api/decorators/allow.decorator.ts)
- **Your Code:** [allow.decorator.ts](src/auth/decorators/allow.decorator.ts)
- **Study:** How Vendure combines permissions

---

#### 6.2 ERPNext Patterns You've Implemented

**Document Status Workflow**
- **ERPNext:** [DocStatus](https://frappeframework.com/docs/v14/user/en/desk/docstatus)
- **Your Code:** [purchase-order.entity.ts](src/purchase/entities/purchase-order.entity.ts:198) - `docStatus` field
- **Study:** [Purchase Order workflow](https://github.com/frappe/erpnext/blob/develop/erpnext/buying/doctype/purchase_order/purchase_order.py)

**Stock Ledger Entry**
- **ERPNext:** [Stock Ledger Entry](https://github.com/frappe/erpnext/blob/develop/erpnext/stock/doctype/stock_ledger_entry/stock_ledger_entry.py)
- **Your Code:** [stock-movement.entity.ts](src/inventory/entities/stock-movement.entity.ts)
- **Study:** [Stock Controller](https://github.com/frappe/erpnext/blob/develop/erpnext/controllers/stock_controller.py)

**Fiscal Year Tracking**
- **ERPNext:** [Fiscal Year](https://github.com/frappe/erpnext/blob/develop/erpnext/accounts/doctype/fiscal_year/fiscal_year.py)
- **Your Code:** [stock.service.ts](src/inventory/stock/stock.service.ts:41-85)
- **Study:** ERPNext accounting integration

**Stock Reconciliation**
- **ERPNext:** [Stock Reconciliation](https://github.com/frappe/erpnext/blob/develop/erpnext/stock/doctype/stock_reconciliation/stock_reconciliation.py)
- **Your Code:** [stock.service.ts](src/inventory/stock/stock.service.ts:1055-1165)
- **Study:** ERPNext's reconciliation workflow

**UOM (Unit of Measurement)**
- **ERPNext:** [UOM](https://github.com/frappe/erpnext/blob/develop/erpnext/stock/doctype/uom/uom.py)
- **Your Code:** [purchase-order.entity.ts](src/purchase/entities/purchase-order.entity.ts:298-321)
- **Study:** Conversion factor patterns

---

### 🔬 Phase 7: Advanced Deep Dives (Week 7-8)

#### 7.1 Transaction Isolation Levels
**Code Reference:** [stock.service.ts](src/inventory/stock/stock.service.ts:128) - `transaction()`

**PostgreSQL Isolation Levels:**
1. **READ UNCOMMITTED** - Dirty reads possible (not in PostgreSQL)
2. **READ COMMITTED** (Default) - See only committed data
3. **REPEATABLE READ** - Consistent snapshot
4. **SERIALIZABLE** - Full isolation

**Your Transactions Use:**
TypeORM defaults to PostgreSQL's READ COMMITTED.

**Learning Resources:**
- 🔗 [PostgreSQL Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- 📖 "Designing Data-Intensive Applications" - Chapter 7
- 🎥 [ACID Properties Explained](https://www.youtube.com/watch?v=pomxJOFVcQs)

**Deep Dive Exercise:**
1. Set isolation level to SERIALIZABLE
2. Test concurrent stock operations
3. Observe serialization errors
4. Implement retry logic

---

#### 7.2 N+1 Query Problem & Solutions
**Problem:** Loading relations in loops causes multiple queries.

```typescript
// BAD: N+1 queries
const orders = await orderRepo.find(); // 1 query
for (const order of orders) {
  order.items = await itemRepo.find({ orderId: order.id }); // N queries
}

// GOOD: Eager loading
const orders = await orderRepo.find({ relations: ['items'] }); // 1 query with JOIN
```

**Your Code Examples:**
- ✅ [purchase-order.service.ts](src/purchase/services/purchase-order.service.ts:111) - Loads relations
- ✅ [auth.guard.ts](src/auth/guards/auth.guard.ts:32) - Loads user.roles together

**Learning Resources:**
- 🔗 [N+1 Query Problem](https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem)
- 🔗 [TypeORM Eager Relations](https://typeorm.io/eager-and-lazy-relations)

---

#### 7.3 Database Indexing Strategy
**Code Reference:** Entity decorators with `@Index()`

**Indexes in Your Code:**
- [user.entity.ts](src/auth/entities/user.entity.ts:31) - `@Index()` on organizationId
- [purchase-order.entity.ts](src/purchase/entities/purchase-order.entity.ts:33) - Composite unique index

**Index Types:**
1. **B-tree** (Default) - Most queries
2. **Hash** - Equality only
3. **GiST/GIN** - Full-text search
4. **BRIN** - Time-series data

**Learning Resources:**
- 🔗 [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- 📖 "PostgreSQL: Up and Running" - Chapter 6
- 🔗 [Use The Index, Luke](https://use-the-index-luke.com/)

**Deep Dive Exercise:**
1. Run `EXPLAIN ANALYZE` on slow queries
2. Add missing indexes
3. Measure query performance improvement
4. Learn when NOT to index

---

#### 7.4 Soft Delete Pattern
**Your Code:** [user.entity.ts](src/auth/entities/user.entity.ts:49-92)

```typescript
@Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
deletedAt: Date | null;

// Helper methods
softDelete(): void {
  this.deletedAt = new Date();
}

restore(): void {
  this.deletedAt = null;
}
```

**Query Pattern:**
```typescript
where: { username: 'john', deletedAt: IsNull() }
```

**Learning Resources:**
- 🔗 [Soft Delete Pattern](https://stackoverflow.com/questions/378331/physical-vs-logical-soft-delete-of-database-record)
- 🔗 [TypeORM Soft Delete](https://typeorm.io/decorator-reference#deletedate)

**Deep Dive Exercise:**
1. Implement global soft-delete subscriber
2. Automatically filter deletedAt in all queries
3. Add `withDeleted()` option for admins

---

### 📖 Recommended Books & Courses

#### Books (Priority Order):
1. 📕 **"Designing Data-Intensive Applications"** by Martin Kleppmann
   - Chapters 5-9 (Replication, Partitioning, Transactions, Consistency)
   - Essential for understanding concurrency and distributed systems

2. 📗 **"Patterns of Enterprise Application Architecture"** by Martin Fowler
   - Repository, Unit of Work, Domain Model patterns
   - Foundation for understanding your architecture

3. 📘 **"Domain-Driven Design"** by Eric Evans
   - Entities, Value Objects, Aggregates
   - Understanding pharmacy domain modeling

4. 📙 **"PostgreSQL: Up and Running"** by Regina Obe
   - Practical PostgreSQL administration
   - Functions, views, performance tuning

5. 📕 **"Clean Architecture"** by Robert Martin
   - Layered architecture principles
   - Dependency inversion

#### Video Courses:
1. 🎥 [NestJS Zero to Hero](https://www.udemy.com/course/nestjs-zero-to-hero/)
2. 🎥 [PostgreSQL Bootcamp](https://www.udemy.com/course/the-complete-python-postgresql-developer-course/)
3. 🎥 [TypeORM Crash Course](https://www.youtube.com/watch?v=JaTbzPcyiOE)

---

### 🧪 Hands-On Exercises

#### Week 1-2: Foundation
- [ ] Trace a complete request through your codebase
- [ ] Draw architecture diagram by hand
- [ ] Explain each module's responsibility
- [ ] Run the app and test each endpoint

#### Week 3-4: Deep Dives
- [ ] Implement pessimistic locking demo
- [ ] Create race condition, then fix it
- [ ] Add Redis session cache
- [ ] Implement stock valuation report

#### Week 5-6: ERPNext Study
- [ ] Clone ERPNext: `git clone https://github.com/frappe/erpnext`
- [ ] Compare your PO workflow with ERPNext's
- [ ] Study ERPNext stock controller
- [ ] Document 3 patterns you want to add

#### Week 7-8: Vendure Study
- [ ] Clone Vendure: `git clone https://github.com/vendure-ecommerce/vendure`
- [ ] Compare RequestContext implementations
- [ ] Study Vendure's plugin architecture
- [ ] Implement a custom plugin

---

### 🎯 Mastery Checklist

**Can you explain from memory?**
- [ ] Request lifecycle from HTTP to database and back
- [ ] Why pessimistic locking prevents race conditions
- [ ] How RequestContext enables multi-tenancy
- [ ] Stock ledger vs state-based inventory
- [ ] FEFO algorithm step-by-step
- [ ] Purchase order state machine transitions
- [ ] Strategy pattern vs Factory pattern
- [ ] N+1 query problem and solutions
- [ ] Soft delete vs hard delete trade-offs
- [ ] Table inheritance patterns

**Can you implement?**
- [ ] Add a new authentication strategy
- [ ] Add a new stock operation type
- [ ] Implement stock valuation method (FIFO/LIFO)
- [ ] Add approval workflow to POs
- [ ] Create a custom decorator
- [ ] Write a database migration
- [ ] Add Redis caching
- [ ] Implement audit logging

**Can you debug?**
- [ ] Find source of race condition
- [ ] Identify N+1 query in logs
- [ ] Fix transaction deadlock
- [ ] Resolve permission issues
- [ ] Debug soft-deleted data appearing

---

### 🌐 External Resources Hub

#### Official Documentation:
- [NestJS Docs](https://docs.nestjs.com/)
- [TypeORM Docs](https://typeorm.io/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Vendure Docs](https://docs.vendure.io/)
- [ERPNext Docs](https://docs.erpnext.com/)

#### GitHub Repositories:
- [Vendure Source](https://github.com/vendure-ecommerce/vendure)
- [ERPNext Source](https://github.com/frappe/erpnext)
- [TypeORM Source](https://github.com/typeorm/typeorm)
- [NestJS Source](https://github.com/nestjs/nest)

#### Community Resources:
- [NestJS Discord](https://discord.gg/nestjs)
- [TypeORM Discussions](https://github.com/typeorm/typeorm/discussions)
- [r/PostgreSQL](https://www.reddit.com/r/PostgreSQL/)
- [Stack Overflow - NestJS Tag](https://stackoverflow.com/questions/tagged/nestjs)

#### Code Examples & Tutorials:
- [NestJS Samples](https://github.com/nestjs/nest/tree/master/sample)
- [Real World Example](https://github.com/gothinkster/realworld)
- [Awesome NestJS](https://github.com/juliandavidmr/awesome-nestjs)

---

### 📊 Learning Roadmap (8-Week Plan)

```
Week 1: NestJS Fundamentals + Your Codebase Tour
├── Day 1-2: NestJS modules, DI, decorators
├── Day 3-4: Read all your entity files
├── Day 5-6: Read all your service files
└── Day 7: Draw architecture diagram

Week 2: Database & TypeORM
├── Day 1-2: TypeORM entities and relations
├── Day 3-4: Transactions and migrations
├── Day 5-6: PostgreSQL functions and views
└── Day 7: Implement a new entity

Week 3: Authentication & Security
├── Day 1-2: Strategy pattern deep dive
├── Day 3-4: RequestContext implementation
├── Day 5-6: Session caching (LRU algorithm)
└── Day 7: Add OAuth strategy

Week 4: Inventory & Concurrency
├── Day 1-2: Pessimistic locking theory
├── Day 3-4: FEFO algorithm implementation
├── Day 5-6: Stock ledger pattern
└── Day 7: Create race condition test

Week 5: Purchase Workflow
├── Day 1-2: State machine pattern
├── Day 3-4: ERPNext PO study
├── Day 5-6: Partial receiving logic
└── Day 7: Add approval workflow

Week 6: Vendure Comparison
├── Day 1-3: Clone and explore Vendure
├── Day 4-5: Compare patterns with yours
├── Day 6-7: Implement Vendure plugin

Week 7: ERPNext Comparison
├── Day 1-3: Clone and explore ERPNext
├── Day 4-5: Compare stock controller
├── Day 6-7: Implement fiscal year logic

Week 8: Advanced Topics
├── Day 1-2: Isolation levels and deadlocks
├── Day 3-4: Performance optimization
├── Day 5-6: Testing strategies
└── Day 7: Document learnings
```

---

### ✅ Final Tips for Deep Understanding

1. **Code by Hand First**
   - Write RequestContext from scratch before reading yours
   - Implement LRU cache on paper
   - Draw state machines before looking at code

2. **Break Things Intentionally**
   - Remove pessimistic locking, observe race conditions
   - Corrupt stock data, test reconciliation
   - Delete indexes, measure performance impact

3. **Teach Someone Else**
   - Write blog posts explaining patterns
   - Create diagrams and share on LinkedIn
   - Do code reviews for junior developers

4. **Compare Implementations**
   - Your code vs Vendure vs ERPNext
   - Identify trade-offs
   - Document why you chose each approach

5. **Build Upon It**
   - Add missing features (invoicing, returns)
   - Implement suggested exercises
   - Refactor based on learnings

---

**Remember:** Understanding comes from doing. Don't just read—implement, break, fix, and teach!

---

**Project Status:** Active Development
**License:** UNLICENSED
**Version:** 0.0.1
