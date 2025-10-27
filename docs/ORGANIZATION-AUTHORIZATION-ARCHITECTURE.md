# Organization-Based Multi-Tenant Authorization Architecture

## Overview

Multi-tenant pharmacy ERP with organization isolation and role-based pharmacy access, following Vendure's patterns.

---

## Entity Relationships

### 1. Organization (Top-Level Boundary)

```typescript
@Entity()
class Organization {
  id: string;                    // Primary key
  code: string;                  // Unique identifier (e.g., "medicare-chain")
  name: string;                  // Display name (e.g., "MediCare Pharmacy Chain")
  token: string;                 // API authentication token

  // Relationships
  pharmacies: Pharmacy[];        // OneToMany
  users: User[];                 // OneToMany
  roles: Role[];                 // OneToMany
}
```

**Purpose:** Complete isolation boundary between different pharmacy chains/companies.

---

### 2. Pharmacy (Location within Organization)

```typescript
@Entity()
class Pharmacy {
  id: string;                    // Primary key
  organizationId: string;        // Foreign key → Organization
  name: string;                  // "Downtown Branch"

  // Relationships
  organization: Organization;    // ManyToOne
}
```

**Purpose:** Physical pharmacy location belonging to one organization.

---

### 3. User (Employee within Organization)

```typescript
@Entity()
class User {
  userId: number;                // Primary key
  username: string;
  organizationId: string;        // Foreign key → Organization

  // Relationships
  organization: Organization;    // ManyToOne
  roles: Role[];                 // ManyToMany (via user_roles table)
}
```

**Purpose:** User account scoped to one organization.

---

### 4. Role (Permission Set + Pharmacy Assignment)

```typescript
@Entity()
class Role {
  roleId: number;                // Primary key
  code: string;                  // "pharmacist", "manager"
  organizationId: string;        // Foreign key → Organization
  permissions: string[];         // ["ReadInventory", "UpdateInventory"]

  // Relationships
  organization: Organization;    // ManyToOne
  pharmacies: Pharmacy[];        // ManyToMany (via role_pharmacies table)
}
```

**Purpose:** Defines WHAT users can do (permissions) and WHERE they can do it (pharmacies).

---

## Relationship Diagram

```
Organization "org-1" (MediCare Chain)
│
├─ Pharmacy A (Downtown)
├─ Pharmacy B (Uptown)
├─ Pharmacy C (Suburban)
│
├─ User: John
│  └─ Role: "Pharmacist"
│     ├─ Permissions: [ReadInventory, UpdateInventory]
│     └─ Pharmacies: [Pharmacy A]  ← John can ONLY access Downtown
│
├─ User: Sarah
│  └─ Role: "Regional Manager"
│     ├─ Permissions: [ReadInventory, UpdateInventory, ManageUsers]
│     └─ Pharmacies: [Pharmacy A, B, C]  ← Sarah can access ALL 3
│
└─ User: Admin
   └─ Role: "Organization Admin"
      ├─ Permissions: [SuperAdmin]
      └─ Pharmacies: []  ← Empty = ALL pharmacies in organization

Organization "org-2" (HealthPlus)
│
├─ Pharmacy X
├─ User: Mike
│  └─ Role: "Pharmacist"
│
└─ COMPLETELY ISOLATED from org-1
```

---

## Database Schema

### Tables and Foreign Keys

```sql
-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  code VARCHAR UNIQUE,
  name VARCHAR,
  token VARCHAR UNIQUE
);

-- Pharmacies belong to ONE organization
CREATE TABLE pharmacies (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),  -- FK
  name VARCHAR
);

-- Users belong to ONE organization
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  username VARCHAR,
  organization_id UUID REFERENCES organizations(id),  -- FK
);

-- Roles belong to ONE organization
CREATE TABLE roles (
  role_id INTEGER PRIMARY KEY,
  code VARCHAR,
  organization_id UUID REFERENCES organizations(id),  -- FK
  permissions TEXT[]
);

-- Junction: Users ↔ Roles (ManyToMany)
CREATE TABLE user_roles (
  user_id INTEGER REFERENCES users(user_id),
  role_id INTEGER REFERENCES roles(role_id),
  PRIMARY KEY (user_id, role_id)
);

-- Junction: Roles ↔ Pharmacies (ManyToMany)
CREATE TABLE role_pharmacies (
  role_id INTEGER REFERENCES roles(role_id),
  pharmacy_id UUID REFERENCES pharmacies(id),
  PRIMARY KEY (role_id, pharmacy_id)
);

-- Stock is scoped by pharmacy (which implies organization)
CREATE TABLE pharmacy_stock (
  id UUID PRIMARY KEY,
  pharmacy_id UUID REFERENCES pharmacies(id),  -- FK
  drug_id INTEGER,
  quantity DECIMAL
  -- NO organization_id column (inferred via pharmacy)
);
```

---

## How Users Get Pharmacy Access

### Chain of Links:

```
User → Roles → Pharmacies
  ↓      ↓        ↓
(ManyToMany) (ManyToMany)
```

### Step by Step:

1. **User has Roles** (ManyToMany via `user_roles`)
2. **Each Role is assigned to Pharmacies** (ManyToMany via `role_pharmacies`)
3. **User's effective pharmacy access = Union of all role pharmacies**

### Example Query:

```sql
-- Get all pharmacies user can access
SELECT DISTINCT p.*
FROM pharmacies p
INNER JOIN role_pharmacies rp ON rp.pharmacy_id = p.id
INNER JOIN roles r ON r.role_id = rp.role_id
INNER JOIN user_roles ur ON ur.role_id = r.role_id
INNER JOIN users u ON u.user_id = ur.user_id
WHERE u.user_id = :userId
  AND u.organization_id = r.organization_id  -- Safety check
  AND p.organization_id = u.organization_id;  -- Safety check
```

---

## Authentication Flow

### 1. User Login

```typescript
POST /auth/login
{
  "organizationCode": "medicare-chain",  // Which organization
  "username": "john",                     // Which user
  "password": "password123"
}
```

### 2. Backend Validation

```typescript
async login(orgCode: string, username: string, password: string) {
  // Step 1: Find organization
  const org = await orgRepository.findOne({
    where: { code: orgCode, active: true }
  });
  if (!org) throw new UnauthorizedException();

  // Step 2: Find user in that organization
  const user = await userRepository.findOne({
    where: { username, organizationId: org.id },
    relations: ['roles', 'roles.pharmacies']
  });
  if (!user) throw new UnauthorizedException();

  // Step 3: Validate password
  const valid = await validatePassword(user, password);
  if (!valid) throw new UnauthorizedException();

  // Step 4: Calculate pharmacy access from roles
  const pharmacyIds = new Set<string>();
  const permissions = new Set<string>();

  for (const role of user.roles) {
    // Collect permissions
    role.permissions.forEach(p => permissions.add(p));

    // Collect pharmacies
    role.pharmacies.forEach(pharmacy => {
      if (pharmacy.organizationId === org.id) {
        pharmacyIds.add(pharmacy.id);
      }
    });
  }

  // Step 5: Create session
  return await createSession(user, org, {
    pharmacyIds: Array.from(pharmacyIds),
    permissions: Array.from(permissions)
  });
}
```

### 3. Session Created

```typescript
// Cached in Redis/memory for performance
interface CachedSession {
  sessionId: number;
  token: string;
  expiresAt: Date;
  user: {
    userId: number;
    username: string;
    organizationId: string;        // ← Scopes all queries
    pharmacyIds: string[];         // ← Pre-calculated from roles
    permissions: string[];         // ← Pre-calculated from roles
  };
}

// Example:
{
  sessionId: 123,
  token: "abc123xyz",
  user: {
    userId: 1,
    username: "john",
    organizationId: "org-1",
    pharmacyIds: ["pharmacy-A"],              // Only Downtown
    permissions: ["ReadInventory", "UpdateInventory"]
  }
}
```

---

## Authorization Flow (Every Request)

### 1. Request with Token

```typescript
GET /stock/levels/pharmacy-A
Headers:
  Authorization: Bearer abc123xyz
```

### 2. Middleware Loads Session

```typescript
// Auth middleware
async validateRequest(req: Request) {
  const token = extractToken(req);

  // Load cached session
  const session = await sessionCache.get(token);
  if (!session || session.expiresAt < new Date()) {
    throw new UnauthorizedException();
  }

  // Create RequestContext
  const ctx = new RequestContext({
    session,
    organization: await loadOrganization(session.user.organizationId)
  });

  // Attach to request
  req.ctx = ctx;
}
```

### 3. RequestContext Created

```typescript
class RequestContext {
  private readonly _session: CachedSession;
  private readonly _organization: Organization;

  // Get active organization ID
  get activeOrganizationId(): string {
    return this._session.user.organizationId;
  }

  // Check if user has permission
  userHasPermissions(permissions: Permission[]): boolean {
    const userPerms = this._session.user.permissions;

    // SuperAdmin bypasses checks
    if (userPerms.includes('SuperAdmin')) return true;

    // Check if user has any of required permissions
    return permissions.some(p => userPerms.includes(p));
  }

  // Check if user can access pharmacy
  userHasAccessToPharmacy(pharmacyId: string): boolean {
    const user = this._session.user;

    // SuperAdmin can access all pharmacies in their org
    if (user.permissions.includes('SuperAdmin')) return true;

    // Check if pharmacy in user's allowed list
    return user.pharmacyIds.includes(pharmacyId);
  }

  // Get authorized pharmacy IDs
  getAuthorizedPharmacyIds(): string[] {
    const user = this._session.user;

    // SuperAdmin: empty array = all pharmacies in org
    if (user.permissions.includes('SuperAdmin')) return [];

    // Regular user: specific list
    return user.pharmacyIds;
  }
}
```

### 4. Controller Authorization

```typescript
@Controller('stock')
export class StockController {
  @Get('levels/:pharmacyId')
  @Allow(Permission.ReadInventory)  // ← Step 1: Check permission
  async getStockLevels(
    @Param('pharmacyId') pharmacyId: string,
    @Ctx() ctx: RequestContext
  ) {
    // Step 2: Check pharmacy access
    if (!ctx.userHasAccessToPharmacy(pharmacyId)) {
      throw new ForbiddenException('No access to this pharmacy');
    }

    return this.stockService.getStockLevels(pharmacyId, ctx);
  }
}
```

### 5. Service Layer Filtering

```typescript
@Injectable()
export class StockService {
  async getStockLevels(pharmacyId: string, ctx: RequestContext) {
    const orgId = ctx.activeOrganizationId;

    // Verify pharmacy belongs to user's organization
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { id: pharmacyId, organizationId: orgId }
    });

    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found in your organization');
    }

    // Get stock (pharmacy is already org-scoped)
    return await this.stockRepo.find({
      where: { pharmacyId }
    });
  }

  // Get stock for all accessible pharmacies
  async getAllStockLevels(ctx: RequestContext) {
    const orgId = ctx.activeOrganizationId;
    const pharmacyIds = ctx.getAuthorizedPharmacyIds();

    // Build query with organization + pharmacy filters
    const query = this.dataSource
      .createQueryBuilder(PharmacyStock, 'stock')
      .innerJoin('stock.pharmacy', 'pharmacy')
      .where('pharmacy.organizationId = :orgId', { orgId });

    // If not SuperAdmin, filter by specific pharmacies
    if (pharmacyIds.length > 0) {
      query.andWhere('stock.pharmacyId IN (:...pharmacyIds)', { pharmacyIds });
    }

    return await query.getMany();
  }
}
```

---

## Authorization Levels Summary

### Level 1: Organization Isolation (Hard Boundary)

```typescript
// All queries filtered by organizationId
const pharmacy = await pharmacyRepo.findOne({
  where: {
    id: pharmacyId,
    organizationId: ctx.activeOrganizationId  // ← Organization filter
  }
});

// Users in org-1 can NEVER see org-2 data
```

### Level 2: Permission Check (What can you do?)

```typescript
@Allow(Permission.UpdateInventory)
// Checks: ctx.userHasPermissions([Permission.UpdateInventory])

// If user doesn't have permission → 403 Forbidden
```

### Level 3: Pharmacy Access (Where can you do it?)

```typescript
if (!ctx.userHasAccessToPharmacy(pharmacyId)) {
  throw new ForbiddenException();
}

// SuperAdmin → can access all pharmacies in their org
// Regular user → can only access pharmacies from their roles
```

---

## Special Cases

### Platform SuperAdmin (ERP Owner)

```typescript
User {
  userId: 0,
  username: "platform-admin",
  organizationId: null,  // ← NOT tied to any organization
  permissions: ["PlatformSuperAdmin"]
}

// Can access ALL organizations
// Used for support, platform management, billing
// Bypasses all organization filters
```

### Organization SuperAdmin

```typescript
User {
  userId: 1,
  username: "admin@medicare.com",
  organizationId: "org-1",  // ← Scoped to MediCare
  permissions: ["SuperAdmin"]
}

// Can access ALL pharmacies in org-1
// Cannot see org-2, org-3, etc.
// pharmacyIds = [] (empty means "all in my org")
```

### Regular User

```typescript
User {
  userId: 2,
  username: "john",
  organizationId: "org-1",
  permissions: ["ReadInventory", "UpdateInventory"],
  pharmacyIds: ["pharmacy-A"]  // ← Specific pharmacy access
}

// Can only access pharmacy-A
// Cannot access pharmacy-B, pharmacy-C
```

---

## Key Design Decisions

### ✅ What We Do:

1. **Foreign Key on User/Role/Pharmacy → Organization** (hard boundary)
2. **ManyToMany for User ↔ Roles** (flexible role assignment)
3. **ManyToMany for Role ↔ Pharmacies** (flexible pharmacy assignment)
4. **Pre-calculate pharmacy access at login** (stored in session cache)
5. **Query filtering via JOINs** (no denormalized organizationId on stock)
6. **Single authentication** (username + password + org code)

### ❌ What We Don't Do:

1. **NO separate tenant databases** (all in same database)
2. **NO organizationId on every table** (use JOINs through pharmacy)
3. **NO user → pharmacy direct link** (always via roles)
4. **NO separate org authentication** (org is context, not user)

---

## Performance Considerations

### Session Caching:
- ✅ User permissions cached in session (no DB query per request)
- ✅ Pharmacy access cached in session (no joins per request)
- ✅ Session stored in Redis with 5-minute TTL

### Query Optimization:
- ✅ Indexes on organizationId columns
- ✅ Indexes on junction tables (user_roles, role_pharmacies)
- ✅ INNER JOIN filters at database level
- ✅ Pharmacy access checked once (in session), not per query

---

## Example Flow: Dispense Stock

```typescript
// 1. Request
POST /stock/dispense
Headers: Authorization: Bearer abc123xyz
Body: {
  "pharmacyId": "pharmacy-A",
  "drugId": 1,
  "quantity": 10
}

// 2. Middleware loads session → creates RequestContext
ctx.activeOrganizationId = "org-1"
ctx.session.user.pharmacyIds = ["pharmacy-A"]

// 3. Controller checks permission
@Allow(Permission.UpdateInventory)
// ✅ User has UpdateInventory permission

// 4. Controller checks pharmacy access
if (!ctx.userHasAccessToPharmacy("pharmacy-A")) // ✅ Pass

// 5. Service validates pharmacy belongs to org
pharmacy = findOne({ id: "pharmacy-A", organizationId: "org-1" })
// ✅ Pharmacy belongs to user's organization

// 6. Service performs dispense
// Query automatically scoped by pharmacyId
stock = find({ pharmacyId: "pharmacy-A", drugId: 1 })

// 7. Success!
```

---

## Summary

### The Chain:

```
Organization (boundary)
    ↓ owns
Pharmacy (location)
    ↑ accessed by
Role (permissions + pharmacy assignments)
    ↑ assigned to
User (account)
    ↓ logs in
Session (cached context)
    ↓ used in
RequestContext (authorization)
    ↓ filters
Queries (organization + pharmacy scoped)
```

### Three-Level Security:

1. **Organization Isolation** - Users can only see their organization's data
2. **Permission Check** - Users can only perform actions they're authorized for
3. **Pharmacy Scope** - Users can only access pharmacies assigned to their roles

### Pre-Calculated at Login:

- ✅ organizationId (from user)
- ✅ pharmacyIds (from user → roles → pharmacies)
- ✅ permissions (from user → roles → permissions)

All stored in cached session for fast authorization checks.

---

*Last Updated: 2025-10-27*
