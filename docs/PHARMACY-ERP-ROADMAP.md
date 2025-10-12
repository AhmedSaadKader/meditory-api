# Pharmacy ERP Development Roadmap

## Current State ✅

**What you have:**
- ✅ Drug catalog with advanced search (wildcards, filters)
- ✅ Ingredient search with synonyms
- ✅ Pagination and filtering
- ✅ Reference data (dosage forms, routes)
- ✅ PostgreSQL + TypeORM
- ✅ Swagger documentation
- ✅ CORS enabled

**Tech Stack:**
- NestJS (framework)
- TypeORM (ORM)
- PostgreSQL (database)
- Swagger (API docs)
- Class-validator (validation)

---

## Architecture Vision

```
Pharmacy ERP
├── Core Modules
│   ├── Auth & Authorization (Users, Roles, Permissions)
│   ├── Drugs (Already built ✅)
│   ├── Inventory (Stock, Expiry, Lot tracking)
│   ├── Prescriptions (Rx processing, refills)
│   ├── Patients (Medical records, allergies)
│   ├── Sales/POS (Checkout, billing)
│   └── Suppliers (Ordering, receiving)
│
├── Clinical Modules
│   ├── Drug Interactions
│   ├── Allergy Checking
│   └── Clinical Decision Support
│
├── Financial Modules
│   ├── Insurance/Claims
│   ├── Accounting
│   └── Reports
│
└── Admin/Support
    ├── Audit Logs
    ├── Reports & Analytics
    └── Settings/Configuration
```

---

## Development Phases

### 🎯 Phase 1: Foundation (Weeks 1-3)

**Goal:** Authentication, authorization, and user management

#### 1.1 Authentication Module
- [ ] JWT-based authentication
- [ ] Login/logout endpoints
- [ ] Password hashing (bcrypt)
- [ ] Refresh tokens
- [ ] Password reset flow

#### 1.2 User Management
- [ ] User entity (id, email, password, firstName, lastName, role)
- [ ] CRUD operations for users
- [ ] Profile management

#### 1.3 Authorization (RBAC)
- [ ] Role entity (Pharmacist, Pharmacy Technician, Cashier, Admin)
- [ ] Permission entity (granular permissions)
- [ ] Guards (role-based, permission-based)
- [ ] Decorators (@Roles, @Permissions)

**Deliverables:**
```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── permissions.guard.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── permissions.decorator.ts
│   └── strategies/
│       └── jwt.strategy.ts
│
└── users/
    ├── users.module.ts
    ├── users.controller.ts
    ├── users.service.ts
    ├── entities/
    │   ├── user.entity.ts
    │   ├── role.entity.ts
    │   └── permission.entity.ts
    └── dto/
        ├── create-user.dto.ts
        └── update-user.dto.ts
```

**Testing:**
- [ ] Can users register/login?
- [ ] Can only admins create new users?
- [ ] Can pharmacists access drug endpoints but not admin endpoints?
- [ ] Are passwords hashed properly?

---

### 🎯 Phase 2: Core Pharmacy Operations (Weeks 4-7)

**Goal:** Prescription management and patient records

#### 2.1 Patient Management
- [ ] Patient entity (demographics, contact info)
- [ ] Medical history
- [ ] Allergy records
- [ ] Insurance information
- [ ] CRUD operations
- [ ] Search and filtering

#### 2.2 Prescription Module
- [ ] Prescription entity
  - Prescription number
  - Patient reference
  - Drug reference
  - Prescriber info (name, DEA)
  - Directions
  - Quantity, refills
  - Status (pending, filled, cancelled)
  - Dates (prescribed, expiry, filled)
- [ ] Create prescription
- [ ] Fill prescription (dispense)
- [ ] Refill handling
- [ ] Controlled substance tracking (DEA schedules)
- [ ] Prescription validation
- [ ] Search prescriptions

#### 2.3 Inventory Management
- [ ] Enhance Drug entity with:
  - Stock quantity
  - Reorder level
  - Reorder quantity
- [ ] InventoryLot entity
  - Lot number
  - Expiry date
  - Quantity
  - Drug reference
- [ ] Stock adjustments (manual)
- [ ] Low stock alerts
- [ ] Expiry date tracking
- [ ] Expired stock alerts

**Deliverables:**
```
src/
├── patients/
│   ├── patients.module.ts
│   ├── patients.controller.ts
│   ├── patients.service.ts
│   ├── entities/
│   │   ├── patient.entity.ts
│   │   ├── allergy.entity.ts
│   │   └── insurance.entity.ts
│   └── dto/
│
├── prescriptions/
│   ├── prescriptions.module.ts
│   ├── prescriptions.controller.ts
│   ├── prescriptions.service.ts
│   ├── entities/
│   │   └── prescription.entity.ts
│   └── dto/
│
└── inventory/
    ├── inventory.module.ts
    ├── inventory.controller.ts
    ├── inventory.service.ts
    ├── entities/
    │   └── inventory-lot.entity.ts
    └── dto/
```

**Testing:**
- [ ] Can create and search patients?
- [ ] Can create prescriptions and link to patients?
- [ ] Can fill prescriptions and decrement refills?
- [ ] Can track controlled substances (Schedule II)?
- [ ] Can track inventory by lot and expiry?
- [ ] Do alerts show for expired/expiring stock?

---

### 🎯 Phase 3: Sales & POS (Weeks 8-10)

**Goal:** Point of sale and billing

#### 3.1 Sales Module
- [ ] Sale entity (invoice)
  - Sale number
  - Date/time
  - Customer/patient reference
  - Total amount
  - Payment method
  - Status (completed, refunded)
- [ ] SaleItem entity
  - Sale reference
  - Drug reference
  - Quantity
  - Unit price
  - Discount
  - Total
- [ ] Create sale (checkout)
- [ ] Link prescription to sale
- [ ] Payment processing
- [ ] Receipt generation
- [ ] Refunds/returns

#### 3.2 Inventory Integration
- [ ] Automatic stock deduction on sale
- [ ] FIFO/FEFO (First Expiry First Out)
- [ ] Stock reservation during checkout

**Deliverables:**
```
src/
└── sales/
    ├── sales.module.ts
    ├── sales.controller.ts
    ├── sales.service.ts
    ├── entities/
    │   ├── sale.entity.ts
    │   └── sale-item.entity.ts
    └── dto/
```

**Testing:**
- [ ] Can create sales for prescription items?
- [ ] Can create sales for OTC items?
- [ ] Does stock automatically decrement?
- [ ] Does FIFO/FEFO work for lot selection?
- [ ] Can process refunds?

---

### 🎯 Phase 4: Supplier & Procurement (Weeks 11-12)

**Goal:** Ordering and receiving from suppliers

#### 4.1 Supplier Management
- [ ] Supplier entity
  - Name, contact info
  - Payment terms
  - Lead time
- [ ] CRUD operations

#### 4.2 Purchase Orders
- [ ] PurchaseOrder entity
  - PO number
  - Supplier reference
  - Date, expected delivery
  - Status (draft, sent, received, cancelled)
- [ ] PurchaseOrderItem entity
  - Drug reference
  - Quantity ordered
  - Unit cost
- [ ] Create PO
- [ ] Send to supplier
- [ ] Receive items (update inventory)
- [ ] Partial receives

**Deliverables:**
```
src/
├── suppliers/
│   ├── suppliers.module.ts
│   ├── suppliers.controller.ts
│   ├── suppliers.service.ts
│   └── entities/
│       └── supplier.entity.ts
│
└── procurement/
    ├── procurement.module.ts
    ├── procurement.controller.ts
    ├── procurement.service.ts
    └── entities/
        ├── purchase-order.entity.ts
        └── purchase-order-item.entity.ts
```

**Testing:**
- [ ] Can create and manage suppliers?
- [ ] Can create purchase orders?
- [ ] Can receive inventory and update stock?
- [ ] Can handle partial receives?

---

### 🎯 Phase 5: Clinical Features (Weeks 13-15)

**Goal:** Drug safety and clinical decision support

#### 5.1 Drug Interactions
- [ ] DrugInteraction entity
  - Drug A, Drug B
  - Severity (major, moderate, minor)
  - Description
- [ ] Check interactions on prescription creation
- [ ] Alert pharmacist of interactions

#### 5.2 Allergy Checking
- [ ] Check patient allergies vs drug ingredients
- [ ] Alert on potential allergic reactions

#### 5.3 Contraindications
- [ ] Age-based restrictions
- [ ] Pregnancy/lactation warnings
- [ ] Disease contraindications

**Deliverables:**
```
src/
└── clinical/
    ├── clinical.module.ts
    ├── clinical.service.ts
    ├── entities/
    │   ├── drug-interaction.entity.ts
    │   └── contraindication.entity.ts
    └── dto/
```

**Testing:**
- [ ] Does system alert for drug interactions?
- [ ] Does system check allergies before dispensing?
- [ ] Can pharmacist override with documentation?

---

### 🎯 Phase 6: Reporting & Analytics (Weeks 16-17)

**Goal:** Business intelligence and compliance reports

#### 6.1 Reports
- [ ] Sales reports (daily, monthly, yearly)
- [ ] Inventory reports (stock levels, expiry)
- [ ] Controlled substance logs (DEA compliance)
- [ ] Prescription reports
- [ ] Financial reports

#### 6.2 Analytics
- [ ] Top-selling drugs
- [ ] Revenue trends
- [ ] Patient statistics
- [ ] Prescriber statistics

**Deliverables:**
```
src/
└── reports/
    ├── reports.module.ts
    ├── reports.controller.ts
    └── reports.service.ts
```

---

### 🎯 Phase 7: Advanced Features (Weeks 18-20)

**Goal:** Insurance, compliance, and integrations

#### 7.1 Insurance/Claims
- [ ] Insurance provider entity
- [ ] Claim entity
- [ ] Claim submission
- [ ] Claim status tracking
- [ ] Adjudication

#### 7.2 Audit Logs
- [ ] Log all critical actions
- [ ] User activity tracking
- [ ] Compliance reporting

#### 7.3 Notifications
- [ ] Email notifications (password reset, low stock)
- [ ] In-app notifications
- [ ] SMS (optional)

**Deliverables:**
```
src/
├── insurance/
│   ├── insurance.module.ts
│   ├── insurance.controller.ts
│   ├── insurance.service.ts
│   └── entities/
│
├── audit/
│   ├── audit.module.ts
│   ├── audit.service.ts
│   └── entities/
│       └── audit-log.entity.ts
│
└── notifications/
    ├── notifications.module.ts
    └── notifications.service.ts
```

---

## Technology Decisions

### Authentication & Authorization
**Recommended:**
- `@nestjs/jwt` + `@nestjs/passport` (JWT auth)
- `bcrypt` (password hashing)
- Custom RBAC implementation (full control)

**Alternative:**
- `@casl/ability` (more advanced RBAC)

### Admin Panel
**Options:**
1. **Build custom with React/Vue** (most control, most work)
2. **AdminJS** (quick, auto-generated from entities)
3. **Retool** (low-code, hosted)
4. **React Admin** (good balance)

**Recommendation for MVP:** AdminJS or React Admin

### PDF Generation (Receipts, Reports)
- `pdfmake` or `@react-pdf/renderer`

### Email
- `@nestjs-modules/mailer` + `nodemailer`

### Job Queue (for async tasks)
- `@nestjs/bull` + Redis

### Caching
- `@nestjs/cache-manager` + Redis

---

## Database Schema Planning

### Key Relationships

```
User 1---* Prescription (created_by)
Patient 1---* Prescription
Patient 1---* Allergy
Patient 1---* Insurance
Drug 1---* Prescription
Drug 1---* InventoryLot
Drug 1---* SaleItem
Drug *---* Drug (interactions)
Sale 1---* SaleItem
Sale *---1 Patient
Prescription ?---1 Sale (optional link)
PurchaseOrder 1---* PurchaseOrderItem
PurchaseOrderItem *---1 Drug
Supplier 1---* PurchaseOrder
```

---

## Development Best Practices

### Code Organization
```
src/
├── common/               # Shared utilities
│   ├── decorators/
│   ├── guards/
│   ├── interceptors/
│   ├── filters/
│   └── pipes/
│
├── config/              # Configuration
│   ├── database.config.ts
│   └── jwt.config.ts
│
└── [module]/            # Each feature module
    ├── [module].module.ts
    ├── [module].controller.ts
    ├── [module].service.ts
    ├── entities/
    ├── dto/
    └── tests/
```

### Testing Strategy
- Unit tests for services
- E2E tests for critical flows
- Integration tests for database operations

### Documentation
- Keep Swagger docs updated
- Add JSDoc comments for complex logic
- Maintain API changelog

### Security
- [ ] Input validation (class-validator)
- [ ] SQL injection protection (TypeORM parameterized queries)
- [ ] Rate limiting
- [ ] CORS configuration
- [ ] Environment variables for secrets
- [ ] Helmet for HTTP headers
- [ ] Password policies

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Foundation | 3 weeks | Auth + RBAC |
| 2. Core Operations | 4 weeks | Patients + Prescriptions + Inventory |
| 3. Sales & POS | 3 weeks | Checkout + Billing |
| 4. Procurement | 2 weeks | Suppliers + POs |
| 5. Clinical | 3 weeks | Interactions + Safety |
| 6. Reporting | 2 weeks | Reports + Analytics |
| 7. Advanced | 3 weeks | Insurance + Audit |
| **Total** | **20 weeks** | **Full MVP** |

**Add:**
- 2-3 weeks for testing & bug fixes
- 2-3 weeks for deployment & documentation
- **Total: ~6 months to production-ready system**

---

## Immediate Next Steps

### This Week
1. **Set up authentication module**
   - Install dependencies (`@nestjs/jwt`, `@nestjs/passport`, `bcrypt`)
   - Create User entity
   - Implement login/register
   - Add JWT strategy

2. **Set up authorization**
   - Create Role and Permission entities
   - Create guards
   - Protect existing drug endpoints

### Next Week
3. **Create Patient module**
   - Patient entity with full demographics
   - CRUD operations
   - Search functionality

4. **Start Prescription module**
   - Prescription entity
   - Basic create/read operations

---

## Success Metrics

**By Month 3:**
- [ ] Can manage users and roles
- [ ] Can manage patients
- [ ] Can create and fill prescriptions
- [ ] Can track inventory with expiry dates

**By Month 6:**
- [ ] Complete POS system
- [ ] Supplier/procurement working
- [ ] Basic reports available
- [ ] Ready for pilot deployment

---

## Questions to Answer

- [ ] Will you support multiple pharmacy locations?
- [ ] What insurance providers need integration?
- [ ] What compliance requirements (HIPAA, DEA)?
- [ ] Will you need mobile apps (React Native/Flutter)?
- [ ] What reporting formats (PDF, Excel, CSV)?
- [ ] Will you integrate with external systems (EMR, PBM)?

---

*Let's build this step by step. Start with authentication, then layer on features progressively.*
