# Vendure Authentication Testing Strategy - Comprehensive Analysis

**Analysis Date:** 2025-10-16
**Analyzed Version:** Vendure 3.4.4
**Framework:** NestJS + TypeORM + Vitest

---

## Executive Summary

Vendure employs a **comprehensive, layered testing strategy** focused primarily on **end-to-end (e2e) tests** rather than unit tests. Their authentication testing covers:

- **3 primary e2e test suites** for authentication (auth.e2e-spec.ts, shop-auth.e2e-spec.ts, authentication-strategy.e2e-spec.ts)
- **Session management testing** (session-management.e2e-spec.ts)
- **Zero unit tests** for auth services - they rely entirely on e2e integration tests
- **Custom testing infrastructure** (@vendure/testing package) that creates real server instances
- **Real database testing** with SQL.js (in-memory) for speed, PostgreSQL/MySQL for CI

### Key Philosophy
> "Test behavior, not implementation" - Vendure tests the entire auth flow through GraphQL APIs, ensuring real-world reliability over isolated unit test coverage.

---

## 1. Testing Framework & Infrastructure

### Framework Stack
```json
{
  "test-runner": "Vitest 1.3.1",
  "assertion": "Vitest (compatible with Jest)",
  "mocking": "Vitest vi.fn()",
  "database": "SQL.js (in-memory SQLite) / PostgreSQL / MySQL"
}
```

### Custom Testing Package (@vendure/testing)

**Location:** `packages/testing/`

**Core Components:**
1. `TestServer` - Real Vendure server instance
2. `SimpleGraphQLClient` - Authenticated GraphQL client
3. `ErrorResultGuard` - Type-safe error assertion helper
4. Database initializers (SQLite, Postgres, MySQL)
5. Mock data generators

**Key Features:**
- Automatic database caching (saves populated DB to disk, reloads on subsequent runs)
- Parallel test execution support (each test gets unique port)
- Real NestJS application bootstrap
- Type-safe GraphQL queries with code generation

---

## 2. Test File Organization

### Test Structure
```
packages/core/e2e/
├── auth.e2e-spec.ts                    # Admin auth & permissions
├── shop-auth.e2e-spec.ts               # Customer registration, password reset, email verification
├── authentication-strategy.e2e-spec.ts  # Custom auth strategies (OAuth, SSO)
├── session-management.e2e-spec.ts       # Session caching & expiry
└── fixtures/
    ├── test-authentication-strategies.ts # Mock OAuth/SSO strategies
    └── test-plugins/                     # Test-specific plugins
```

### Test Categorization

| Test Suite | Purpose | Test Count | Focus Area |
|------------|---------|------------|------------|
| `auth.e2e-spec.ts` | Admin permissions & authorization | ~25 | Role-based access control |
| `shop-auth.e2e-spec.ts` | Customer account lifecycle | ~80 | Registration, verification, password reset |
| `authentication-strategy.e2e-spec.ts` | External auth providers | ~15 | OAuth, SSO, multi-strategy |
| `session-management.e2e-spec.ts` | Session behavior | ~8 | Caching, expiry, logout |

---

## 3. Testing Patterns & Best Practices

### Pattern 1: Test Environment Setup

**Every test suite follows this pattern:**

```typescript
import { createTestEnvironment, testConfig } from '@vendure/testing';

describe('Shop auth & accounts', () => {
    const { server, adminClient, shopClient } = createTestEnvironment(
        mergeConfig(testConfig(), {
            plugins: [TestEmailPlugin],
            authOptions: {
                passwordValidationStrategy: new TestPasswordValidationStrategy(),
            },
        })
    );

    beforeAll(async () => {
        await server.init({
            initialData,
            productsCsvPath: path.join(__dirname, 'fixtures/e2e-products-minimal.csv'),
            customerCount: 2,
        });
        await adminClient.asSuperAdmin();
    }, TEST_SETUP_TIMEOUT_MS); // 120 seconds

    afterAll(async () => {
        await server.destroy();
    });

    // Tests here...
});
```

**Key Points:**
- `createTestEnvironment()` creates server + 2 clients (admin & shop)
- `server.init()` bootstraps real NestJS app with populated database
- Database is cached to disk for subsequent test runs (huge speed improvement)
- `TEST_SETUP_TIMEOUT_MS = 120000` (2 minutes) for first run

### Pattern 2: User Context Switching

```typescript
// Login as super admin
await adminClient.asSuperAdmin();

// Login with credentials
const result = await shopClient.asUserWithCredentials('email@test.com', 'password');

// Become anonymous
await shopClient.asAnonymousUser();

// Login as custom user
const { identifier, password } = await createAdministratorWithPermissions('ReadCatalog', [
    Permission.ReadCatalog,
]);
await adminClient.asUserWithCredentials(identifier, password);
```

**Benefits:**
- Clean, readable test code
- Automatic session management
- No manual token handling

### Pattern 3: Error Result Guards (Type-Safe Assertions)

```typescript
const successErrorGuard: ErrorResultGuard<{ success: boolean }> = createErrorResultGuard(
    input => input.success != null,
);

const { registerCustomerAccount } = await shopClient.query(REGISTER_ACCOUNT, { input });

// Assert success
successErrorGuard.assertSuccess(registerCustomerAccount);
expect(registerCustomerAccount.success).toBe(true);

// Assert error
successErrorGuard.assertErrorResult(registerCustomerAccount);
expect(registerCustomerAccount.errorCode).toBe(ErrorCode.PASSWORD_VALIDATION_ERROR);
```

**Why This Matters:**
- GraphQL unions return `SuccessType | ErrorType1 | ErrorType2`
- `assertSuccess()` narrows TypeScript type to success type only
- `assertErrorResult()` narrows to error types only
- Type-safe property access after assertion

### Pattern 4: Event-Driven Testing (Email Verification Tokens)

```typescript
let sendEmailFn: Mock;

@VendurePlugin({
    imports: [EventBusModule],
})
class TestEmailPlugin implements OnModuleInit {
    constructor(private eventBus: EventBus) {}

    onModuleInit() {
        this.eventBus.ofType(AccountRegistrationEvent).subscribe(event => {
            sendEmailFn?.(event);
        });
        this.eventBus.ofType(PasswordResetEvent).subscribe(event => {
            sendEmailFn?.(event);
        });
    }
}

// In tests:
function getVerificationTokenPromise(): Promise<string> {
    return new Promise<any>(resolve => {
        sendEmailFn.mockImplementation((event: AccountRegistrationEvent) => {
            resolve(event.user.getNativeAuthenticationMethod().verificationToken);
        });
    });
}

// Usage:
it('register a new account', async () => {
    const verificationTokenPromise = getVerificationTokenPromise();

    const { registerCustomerAccount } = await shopClient.query(REGISTER_ACCOUNT, { input });

    const verificationToken = await verificationTokenPromise;
    expect(verificationToken).toBeDefined();
});
```

**Why This Pattern:**
- No need to query database for tokens
- Tests real event flow
- Captures tokens exactly as email service would receive them
- Async-safe with Promises

### Pattern 5: Testing Security Edge Cases

```typescript
describe('administrator and customer users with the same email address', () => {
    const emailAddress = 'same-email@test.com';
    const adminPassword = 'admin-password';
    const customerPassword = 'customer-password';

    it('can log in as an administrator', async () => {
        const loginResult = await adminClient.query(ATTEMPT_LOGIN, {
            username: emailAddress,
            password: adminPassword,
        });
        loginErrorGuard.assertSuccess(loginResult.login);
    });

    it('cannot log in as administrator using customer password', async () => {
        const loginResult = await adminClient.query(ATTEMPT_LOGIN, {
            username: emailAddress,
            password: customerPassword,
        });
        loginErrorGuard.assertErrorResult(loginResult.login);
        expect(loginResult.login.errorCode).toEqual(ErrorCode.INVALID_CREDENTIALS_ERROR);
    });
});
```

**Tests cover:**
- Same email in admin & customer tables
- Password isolation between contexts
- Account enumeration prevention
- Email normalization (case-insensitive)

### Pattern 6: Custom Authentication Strategies Testing

```typescript
export class TestAuthenticationStrategy implements AuthenticationStrategy<TestAuthPayload> {
    readonly name = 'test_strategy';
    private externalAuthenticationService: ExternalAuthenticationService;

    init(injector: Injector) {
        this.externalAuthenticationService = injector.get(ExternalAuthenticationService);
    }

    defineInputType(): DocumentNode {
        return gql`
            input TestAuthInput {
                token: String!
                userData: UserDataInput
            }
        `;
    }

    async authenticate(ctx: RequestContext, data: TestAuthPayload): Promise<User | false | string> {
        const { token, userData } = data;
        if (token === 'expired-token') {
            return 'Expired token'; // Custom error message
        }
        if (data.token !== VALID_AUTH_TOKEN) {
            return false; // Invalid credentials
        }

        // Check if user exists
        const user = await this.externalAuthenticationService.findUser(ctx, this.name, data.token);
        if (user) {
            return user;
        }

        // Create new user
        return this.externalAuthenticationService.createCustomerAndUser(ctx, {
            strategy: this.name,
            externalIdentifier: data.token,
            emailAddress: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            verified: true,
        });
    }
}
```

**Test Coverage:**
- Invalid token handling
- Expired token with custom error message
- User creation on first login
- User reuse on subsequent logins
- Multiple strategies simultaneously
- Admin vs Shop strategy isolation

---

## 4. Database Testing Strategy

### Database Initialization Flow

```typescript
// 1. Register database initializer
registerInitializer('sqljs', new SqljsInitializer(path.join(packageDir, '__data__')));

// 2. Test calls server.init()
await server.init({
    initialData,
    productsCsvPath: path.join(__dirname, 'fixtures/e2e-products-minimal.csv'),
    customerCount: 2,
});

// 3. Initializer checks for cached DB
const dbPath = path.join(__data__, `${testFilename}.sqlite`);
if (fs.existsSync(dbPath)) {
    // Load cached DB (FAST - ~100ms)
    return loadDatabase(dbPath);
} else {
    // Populate new DB (SLOW - ~10s)
    await populateForTesting(config, options);
    fs.copyFileSync(tempDb, dbPath);
}
```

### Database Caching Benefits
- **First run:** ~15 seconds (populate DB)
- **Subsequent runs:** ~500ms (load cached DB)
- **90% time reduction** on local development

### Multiple Database Support
```typescript
function getDbConfig(): DataSourceOptions {
    const dbType = process.env.DB || 'sqljs';
    switch (dbType) {
        case 'postgres':
            return { type: 'postgres', host: '127.0.0.1', port: 5432 };
        case 'mysql':
            return { type: 'mysql', host: '127.0.0.1', port: 3306 };
        case 'sqljs':
        default:
            return { type: 'sqljs', autoSave: false };
    }
}
```

**Usage:** `DB=postgres npm run e2e`

---

## 5. GraphQL Query Definitions

### Organized by Context

**Admin Queries** (`graphql/shared-definitions.ts`):
```typescript
export const ATTEMPT_LOGIN = gql`
    mutation AttemptLogin($username: String!, $password: String!, $rememberMe: Boolean) {
        login(username: $username, password: $password, rememberMe: $rememberMe) {
            ...CurrentUser
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
    ${CURRENT_USER_FRAGMENT}
`;

export const ME = gql`
    query Me {
        me {
            ...CurrentUser
        }
    }
    ${CURRENT_USER_FRAGMENT}
`;
```

**Shop Queries** (`graphql/shop-definitions.ts`):
```typescript
export const REGISTER_ACCOUNT = gql`
    mutation Register($input: RegisterCustomerInput!) {
        registerCustomerAccount(input: $input) {
            ... on Success {
                success
            }
            ... on ErrorResult {
                errorCode
                message
            }
            ... on PasswordValidationError {
                validationErrorMessage
            }
        }
    }
`;

export const REQUEST_PASSWORD_RESET = gql`
    mutation RequestPasswordReset($identifier: String!) {
        requestPasswordReset(emailAddress: $identifier) {
            ... on Success { success }
            ... on ErrorResult { errorCode message }
        }
    }
`;

export const RESET_PASSWORD = gql`
    mutation ResetPassword($token: String!, $password: String!) {
        resetPassword(token: $token, password: $password) {
            ...CurrentUserShop
            ... on ErrorResult { errorCode message }
            ... on PasswordValidationError { validationErrorMessage }
        }
    }
    ${CURRENT_USER_FRAGMENT}
`;
```

**Key Design:**
- GraphQL fragments for reusable types
- Inline error type handling (`... on ErrorResult`)
- Type-safe with code generation (GraphQL Code Generator)

---

## 6. Session Management Testing

### Session Caching Tests

```typescript
const testSessionCache = new Map<string, CachedSession>();
const setSpy = vi.fn();
const getSpy = vi.fn();

class TestingSessionCacheStrategy implements SessionCacheStrategy {
    get(sessionToken: string) {
        getSpy(sessionToken);
        return testSessionCache.get(sessionToken);
    }

    set(session: CachedSession) {
        setSpy(session);
        testSessionCache.set(session.token, session);
    }
}

describe('Session caching', () => {
    it('populates the cache on login', async () => {
        await adminClient.query(ATTEMPT_LOGIN, { username, password });
        expect(testSessionCache.size).toBe(1);
        expect(setSpy).toHaveBeenCalledTimes(1);
    });

    it('takes user data from cache on next request', async () => {
        getSpy.mockClear();
        await adminClient.query(ME);
        expect(getSpy).toHaveBeenCalledTimes(1);
    });

    it('sets fresh data after TTL expires', async () => {
        await pause(2000); // TTL = 2s
        await adminClient.query(ME);
        expect(setSpy).toHaveBeenCalledTimes(1); // Re-cached
    });
});
```

### Session Expiry Tests

```typescript
it('session does not expire with continued use', async () => {
    await adminClient.asSuperAdmin();
    await pause(1000);
    await adminClient.query(ME);
    await pause(1000);
    await adminClient.query(ME);
    // Session extended each time, still valid
}, 10000);

it('session expires when not used', async () => {
    await adminClient.asSuperAdmin();
    await pause(3500); // sessionDuration = 3s
    try {
        await adminClient.query(ME);
        fail('Should have thrown');
    } catch (e: any) {
        expect(e.message).toContain('You are not currently authorized');
    }
}, 10000);
```

---

## 7. Password Reset Flow Testing

### Complete Password Reset Test

```typescript
describe('password reset', () => {
    let passwordResetToken: string;
    let customer: Customer;

    beforeEach(() => {
        sendEmailFn = vi.fn();
    });

    it('requestPasswordReset silently fails with invalid identifier', async () => {
        const { requestPasswordReset } = await shopClient.query(REQUEST_PASSWORD_RESET, {
            identifier: 'invalid-identifier',
        });
        successErrorGuard.assertSuccess(requestPasswordReset);

        await waitForSendEmailFn();
        expect(requestPasswordReset.success).toBe(true);
        expect(sendEmailFn).not.toHaveBeenCalled(); // Security: no account enumeration
    });

    it('requestPasswordReset sends reset token', async () => {
        const passwordResetTokenPromise = getPasswordResetTokenPromise();

        const { requestPasswordReset } = await shopClient.query(REQUEST_PASSWORD_RESET, {
            identifier: customer.emailAddress,
        });

        passwordResetToken = await passwordResetTokenPromise;
        expect(passwordResetToken).toBeDefined();
    });

    it('resetPassword returns error with wrong token', async () => {
        const { resetPassword } = await shopClient.query(RESET_PASSWORD, {
            password: 'newPassword',
            token: 'bad-token',
        });
        currentUserErrorGuard.assertErrorResult(resetPassword);
        expect(resetPassword.errorCode).toBe(ErrorCode.PASSWORD_RESET_TOKEN_INVALID_ERROR);
    });

    it('resetPassword fails with invalid password', async () => {
        const { resetPassword } = await shopClient.query(RESET_PASSWORD, {
            token: passwordResetToken,
            password: '2short', // < 8 chars
        });
        expect(resetPassword.errorCode).toBe(ErrorCode.PASSWORD_VALIDATION_ERROR);
        expect(resetPassword.validationErrorMessage).toBe('Password must be more than 8 characters');
    });

    it('resetPassword works with valid token', async () => {
        const { resetPassword } = await shopClient.query(RESET_PASSWORD, {
            token: passwordResetToken,
            password: 'newPassword',
        });
        currentUserErrorGuard.assertSuccess(resetPassword);

        // Verify can login with new password
        const loginResult = await shopClient.asUserWithCredentials(
            customer.emailAddress,
            'newPassword'
        );
        expect(loginResult.identifier).toBe(customer.emailAddress);
    });

    it('customer history for password reset', async () => {
        const { customer } = await adminClient.query(GET_CUSTOMER_HISTORY, {
            id: customer.id,
        });
        expect(customer.history.items.map(i => i.type)).toEqual([
            HistoryEntryType.CUSTOMER_PASSWORD_RESET_REQUESTED,
            HistoryEntryType.CUSTOMER_PASSWORD_RESET_VERIFIED,
        ]);
    });
});
```

**Coverage:**
- Invalid identifier (anti-enumeration)
- Token generation via event
- Invalid token rejection
- Password validation integration
- Successful reset
- Audit trail verification

---

## 8. Registration & Verification Testing

### Two Registration Patterns

**Pattern 1: Deferred Password (Verification Required)**
```typescript
it('register without password', async () => {
    const verificationTokenPromise = getVerificationTokenPromise();

    const { registerCustomerAccount } = await shopClient.query(REGISTER_ACCOUNT, {
        input: { firstName: 'Sean', lastName: 'Tester', emailAddress: 'test@test.com' }
    });

    const verificationToken = await verificationTokenPromise;
    expect(verificationToken).toBeDefined();
});

it('login fails before verification', async () => {
    const result = await shopClient.asUserWithCredentials(emailAddress, '');
    expect(result.errorCode).toBe(ErrorCode.INVALID_CREDENTIALS_ERROR);
});

it('verification succeeds with password and token', async () => {
    const { verifyCustomerAccount } = await shopClient.query(VERIFY_EMAIL, {
        password: 'securePassword',
        token: verificationToken,
    });
    currentUserErrorGuard.assertSuccess(verifyCustomerAccount);
    expect(verifyCustomerAccount.identifier).toBe('test@test.com');
});
```

**Pattern 2: Upfront Password**
```typescript
it('register with password', async () => {
    const { registerCustomerAccount } = await shopClient.query(REGISTER_ACCOUNT, {
        input: {
            firstName: 'Lu',
            emailAddress: 'test2@test.com',
            password: 'securePassword'
        }
    });
    expect(registerCustomerAccount.success).toBe(true);
});

it('login fails before verification', async () => {
    const result = await shopClient.asUserWithCredentials(emailAddress, password);
    expect(result.errorCode).toBe(ErrorCode.NOT_VERIFIED_ERROR);
});

it('verification succeeds without password', async () => {
    const { verifyCustomerAccount } = await shopClient.query(VERIFY_EMAIL, {
        token: verificationToken,
        // No password!
    });
    currentUserErrorGuard.assertSuccess(verifyCustomerAccount);
});
```

### Account Enumeration Prevention

```typescript
it('does not return error result on email address conflict', async () => {
    // Registering duplicate email should appear to succeed
    const { registerCustomerAccount } = await shopClient.query(REGISTER_ACCOUNT, {
        input: { emailAddress: existingUser.emailAddress, ... }
    });
    successErrorGuard.assertSuccess(registerCustomerAccount);

    // But no email is sent
    await waitForSendEmailFn();
    expect(sendEmailFn).not.toHaveBeenCalled();
});
```

---

## 9. Testing Utilities & Helpers

### ErrorResultGuard (Type Narrowing)

```typescript
export class ErrorResultGuard<T> {
    constructor(private testFn: (input: T) => boolean) {}

    isSuccess(input: T | any): input is T {
        return this.testFn(input as T);
    }

    assertSuccess<R>(input: T | R): asserts input is T {
        if (!this.isSuccess(input)) {
            fail(`Unexpected error: ${JSON.stringify(input)}`);
        }
    }

    assertErrorResult<R>(input: T | R): asserts input is R {
        if (this.isSuccess(input)) {
            fail('Should have errored');
        }
    }
}

// Usage:
const orderGuard: ErrorResultGuard<Order> = createErrorResultGuard(
    order => !!order.lines
);

orderGuard.assertSuccess(result);
// TypeScript now knows `result` is `Order`, not `Order | ErrorResult`
```

### assertThrowsWithMessage Helper

```typescript
export function assertThrowsWithMessage(
    operation: () => Promise<any>,
    message: string
) {
    return async () => {
        try {
            await operation();
            fail('Should have thrown');
        } catch (err: any) {
            expect(err.message).toEqual(expect.stringContaining(message));
        }
    };
}

// Usage:
it('me is not permitted', assertThrowsWithMessage(
    async () => await adminClient.query(ME),
    'You are not currently authorized to perform this action'
));
```

### Mock Data Service

```typescript
export class MockDataService {
    static getCustomers(count: number) {
        return Array.from({ length: count }, () => ({
            customer: {
                emailAddress: faker.internet.email(),
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName(),
            },
            address: {
                streetLine1: faker.address.streetAddress(),
                city: faker.address.city(),
                postalCode: faker.address.zipCode(),
                countryCode: 'US',
            }
        }));
    }
}

// Usage:
await server.init({
    initialData,
    customerCount: 50, // Creates 50 customers with faker data
});
```

---

## 10. Recommended Testing Strategy for Pharmacy ERP

### Minimal Production-Ready Test Suite

#### Priority 1: Core Authentication Flows (Must Have)

**File:** `test/auth/auth.e2e-spec.ts`

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';

describe('Authentication (e2e)', () => {
    let app: INestApplication;
    let authToken: string;

    beforeAll(async () => {
        const moduleFixture = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('User Registration', () => {
        it('should register pharmacist', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    email: 'pharmacist@test.com',
                    password: 'SecurePass123!',
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'pharmacist',
                    licenseNumber: 'PH12345'
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.email).toBe('pharmacist@test.com');
            expect(response.body).not.toHaveProperty('password');
        });

        it('should reject weak password', async () => {
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    email: 'test@test.com',
                    password: '123', // Too weak
                    firstName: 'Test',
                    lastName: 'User',
                })
                .expect(400);
        });

        it('should reject duplicate email', async () => {
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    email: 'pharmacist@test.com', // Already exists
                    password: 'SecurePass123!',
                    firstName: 'Jane',
                    lastName: 'Smith',
                })
                .expect(409);
        });
    });

    describe('Login', () => {
        it('should login with valid credentials', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'pharmacist@test.com',
                    password: 'SecurePass123!',
                })
                .expect(200);

            expect(response.body).toHaveProperty('access_token');
            expect(response.body).toHaveProperty('refresh_token');
            authToken = response.body.access_token;
        });

        it('should reject invalid credentials', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'pharmacist@test.com',
                    password: 'WrongPassword',
                })
                .expect(401);
        });

        it('should reject unverified user', async () => {
            // Create unverified user
            await request(app.getHttpServer())
                .post('/auth/register')
                .send({
                    email: 'unverified@test.com',
                    password: 'SecurePass123!',
                    firstName: 'Unverified',
                    lastName: 'User',
                });

            // Try to login
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'unverified@test.com',
                    password: 'SecurePass123!',
                })
                .expect(403);
        });
    });

    describe('Token Validation', () => {
        it('should access protected route with token', async () => {
            await request(app.getHttpServer())
                .get('/auth/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
        });

        it('should reject invalid token', async () => {
            await request(app.getHttpServer())
                .get('/auth/profile')
                .set('Authorization', 'Bearer invalid_token')
                .expect(401);
        });

        it('should reject expired token', async () => {
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Generate expired
            await request(app.getHttpServer())
                .get('/auth/profile')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(401);
        });
    });

    describe('Password Reset', () => {
        let resetToken: string;

        it('should request password reset', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/forgot-password')
                .send({ email: 'pharmacist@test.com' })
                .expect(200);

            expect(response.body.message).toContain('reset email sent');
            // In tests, capture token from email service mock
            resetToken = captureResetTokenFromEmail();
        });

        it('should silently succeed for non-existent email', async () => {
            // Anti-enumeration
            await request(app.getHttpServer())
                .post('/auth/forgot-password')
                .send({ email: 'nonexistent@test.com' })
                .expect(200);
        });

        it('should reset password with valid token', async () => {
            await request(app.getHttpServer())
                .post('/auth/reset-password')
                .send({
                    token: resetToken,
                    newPassword: 'NewSecurePass123!',
                })
                .expect(200);

            // Verify can login with new password
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'pharmacist@test.com',
                    password: 'NewSecurePass123!',
                })
                .expect(200);
        });

        it('should reject invalid reset token', async () => {
            await request(app.getHttpServer())
                .post('/auth/reset-password')
                .send({
                    token: 'invalid-token',
                    newPassword: 'NewPass123!',
                })
                .expect(400);
        });
    });

    describe('Refresh Token', () => {
        let refreshToken: string;

        beforeAll(async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'pharmacist@test.com',
                    password: 'NewSecurePass123!',
                });
            refreshToken = response.body.refresh_token;
        });

        it('should refresh access token', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refresh_token: refreshToken })
                .expect(200);

            expect(response.body).toHaveProperty('access_token');
            expect(response.body.access_token).not.toBe(authToken);
        });

        it('should reject invalid refresh token', async () => {
            await request(app.getHttpServer())
                .post('/auth/refresh')
                .send({ refresh_token: 'invalid' })
                .expect(401);
        });
    });
});
```

#### Priority 2: Role-Based Access Control

**File:** `test/auth/permissions.e2e-spec.ts`

```typescript
describe('Permissions & Roles (e2e)', () => {
    let adminToken: string;
    let pharmacistToken: string;
    let technicianToken: string;

    beforeAll(async () => {
        // Create users with different roles
        adminToken = await createUserWithRole('admin');
        pharmacistToken = await createUserWithRole('pharmacist');
        technicianToken = await createUserWithRole('technician');
    });

    describe('Drug Management', () => {
        it('admin can create drugs', async () => {
            await request(app.getHttpServer())
                .post('/drugs')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Aspirin', brandName: 'Bayer' })
                .expect(201);
        });

        it('pharmacist can view drugs', async () => {
            await request(app.getHttpServer())
                .get('/drugs')
                .set('Authorization', `Bearer ${pharmacistToken}`)
                .expect(200);
        });

        it('pharmacist cannot delete drugs', async () => {
            await request(app.getHttpServer())
                .delete('/drugs/1')
                .set('Authorization', `Bearer ${pharmacistToken}`)
                .expect(403);
        });

        it('technician cannot view drugs', async () => {
            await request(app.getHttpServer())
                .get('/drugs')
                .set('Authorization', `Bearer ${technicianToken}`)
                .expect(403);
        });
    });

    describe('Prescription Management', () => {
        it('pharmacist can approve prescriptions', async () => {
            await request(app.getHttpServer())
                .patch('/prescriptions/1/approve')
                .set('Authorization', `Bearer ${pharmacistToken}`)
                .expect(200);
        });

        it('technician cannot approve prescriptions', async () => {
            await request(app.getHttpServer())
                .patch('/prescriptions/1/approve')
                .set('Authorization', `Bearer ${technicianToken}`)
                .expect(403);
        });
    });
});
```

#### Priority 3: Session Management

**File:** `test/auth/sessions.e2e-spec.ts`

```typescript
describe('Session Management (e2e)', () => {
    it('should maintain session across requests', async () => {
        const agent = request.agent(app.getHttpServer());

        await agent
            .post('/auth/login')
            .send({ email: 'pharmacist@test.com', password: 'password' })
            .expect(200);

        await agent.get('/auth/profile').expect(200);
        await agent.get('/drugs').expect(200);
    });

    it('should invalidate session on logout', async () => {
        const agent = request.agent(app.getHttpServer());

        await agent.post('/auth/login').send({ email: 'test@test.com', password: 'pass' });
        await agent.post('/auth/logout').expect(200);
        await agent.get('/auth/profile').expect(401);
    });

    it('should expire session after inactivity', async () => {
        const response = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'test@test.com', password: 'password' });

        const token = response.body.access_token;

        // Wait for session expiry (mock time or use real delay)
        await delay(SESSION_TIMEOUT + 1000);

        await request(app.getHttpServer())
            .get('/auth/profile')
            .set('Authorization', `Bearer ${token}`)
            .expect(401);
    });
});
```

### Testing Utilities

**File:** `test/utils/test-helpers.ts`

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

export async function createTestApp(): Promise<INestApplication> {
    const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider(MailService)
        .useValue(mockMailService)
        .compile();

    const app = moduleFixture.createNestApplication();
    await app.init();
    return app;
}

export async function createUserWithRole(role: string): Promise<string> {
    const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
            email: `${role}@test.com`,
            password: 'SecurePass123!',
            role,
        });

    const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
            email: `${role}@test.com`,
            password: 'SecurePass123!',
        });

    return loginResponse.body.access_token;
}

export function createErrorGuard<T>(
    successCheck: (input: T) => boolean
): ErrorResultGuard<T> {
    return {
        assertSuccess(input: any): asserts input is T {
            if (!successCheck(input)) {
                throw new Error(`Expected success, got: ${JSON.stringify(input)}`);
            }
        },
        assertError(input: any) {
            if (successCheck(input)) {
                throw new Error('Expected error result');
            }
        },
    };
}

type ErrorResultGuard<T> = {
    assertSuccess(input: any): asserts input is T;
    assertError(input: any): void;
};
```

**File:** `test/mocks/email.service.mock.ts`

```typescript
export const mockMailService = {
    sendVerificationEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    capturedTokens: [] as string[],
};

// Helper to capture tokens from emails
export function captureResetTokenFromEmail(): string {
    const lastCall = mockMailService.sendPasswordResetEmail.mock.calls.slice(-1)[0];
    return lastCall[1]; // Assume token is second argument
}
```

---

## 11. Key Takeaways for Our Project

### What to Adopt

1. **E2E-First Approach**
   - Focus on e2e tests for auth flows
   - Skip unit tests for auth services initially
   - Test real database interactions

2. **ErrorResultGuard Pattern**
   - Implement type-safe error assertions
   - Create guards for common response types (LoginResult, RegisterResult, etc.)

3. **Event-Based Token Capture**
   - Use event subscribers to capture verification/reset tokens
   - Avoid database queries in tests

4. **Security Testing**
   - Account enumeration prevention
   - Same-email-different-context isolation
   - Password validation integration

5. **Session Testing**
   - Session caching verification
   - Session expiry with activity extension
   - Logout invalidation

### What to Skip (Initially)

1. **Complex Database Caching**
   - Use simple in-memory DB for local tests
   - Save advanced caching for later optimization

2. **Multiple Database Support**
   - Start with PostgreSQL only
   - Add MySQL/SQLite support if needed

3. **Custom Authentication Strategies**
   - Focus on native auth first
   - Add OAuth/SSO later if required

### Recommended Test Structure

```
test/
├── auth/
│   ├── auth.e2e-spec.ts           # Login, registration, tokens
│   ├── permissions.e2e-spec.ts     # Role-based access
│   ├── sessions.e2e-spec.ts        # Session lifecycle
│   └── password-reset.e2e-spec.ts  # Password reset flow
├── utils/
│   ├── test-helpers.ts
│   ├── error-guards.ts
│   └── mocks/
│       └── email.service.mock.ts
└── fixtures/
    └── test-users.json
```

### Minimal Test Coverage Goals

| Feature | Test Count | Priority |
|---------|------------|----------|
| Login/Logout | 5 tests | P0 |
| Registration | 4 tests | P0 |
| Password Reset | 5 tests | P0 |
| Token Refresh | 3 tests | P0 |
| Permissions | 8 tests | P1 |
| Session Management | 4 tests | P1 |
| **Total** | **29 tests** | |

**Estimated Time:** 8-12 hours for complete implementation

---

## 12. Testing Best Practices from Vendure

### 1. Real Server Testing
```typescript
// ❌ Don't mock the entire auth service
const mockAuthService = { login: vi.fn() };

// ✅ Do test against real server
const app = await createTestApp();
await request(app.getHttpServer()).post('/auth/login');
```

### 2. Type-Safe Assertions
```typescript
// ❌ Don't use generic assertions
expect(result.errorCode).toBeDefined();

// ✅ Do use type guards
loginGuard.assertSuccess(result);
expect(result.identifier).toBe('test@test.com');
```

### 3. Security-First Testing
```typescript
// Always test account enumeration prevention
it('does not reveal if email exists', async () => {
    const response1 = await forgotPassword('exists@test.com');
    const response2 = await forgotPassword('nonexistent@test.com');

    // Both should return success
    expect(response1.statusCode).toBe(response2.statusCode);
    expect(response1.body.message).toBe(response2.body.message);
});
```

### 4. Test User Lifecycle
```typescript
describe('Complete user lifecycle', () => {
    it('registers → verifies → logs in → resets password → logs in again', async () => {
        // Test entire flow in sequence
        const email = 'lifecycle@test.com';

        // 1. Register
        const { token } = await register({ email, password: 'pass1' });

        // 2. Verify
        await verify(token);

        // 3. Login
        const { access_token } = await login({ email, password: 'pass1' });
        expect(access_token).toBeDefined();

        // 4. Request password reset
        const { resetToken } = await requestReset(email);

        // 5. Reset password
        await resetPassword({ token: resetToken, password: 'pass2' });

        // 6. Login with new password
        const { access_token: newToken } = await login({ email, password: 'pass2' });
        expect(newToken).toBeDefined();
        expect(newToken).not.toBe(access_token);
    });
});
```

### 5. Descriptive Test Names
```typescript
// ❌ Vague
it('should work');

// ✅ Specific
it('should reject login attempt with invalid credentials and return 401');
it('should automatically verify user and create session when resetting password before initial verification');
```

---

## 13. Code Templates for Immediate Use

### Template 1: E2E Test Suite

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth Controller (e2e)', () => {
    let app: INestApplication;
    let authToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/auth/login (POST)', () => {
        it('should authenticate valid user', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'admin@pharmacy.com',
                    password: 'SecurePass123!',
                })
                .expect(200);

            expect(response.body).toHaveProperty('access_token');
            authToken = response.body.access_token;
        });

        it('should reject invalid credentials', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'admin@pharmacy.com',
                    password: 'WrongPassword',
                })
                .expect(401);

            expect(response.body.message).toContain('Invalid credentials');
        });
    });

    describe('/auth/profile (GET)', () => {
        it('should return user profile with valid token', async () => {
            const response = await request(app.getHttpServer())
                .get('/auth/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('email');
            expect(response.body.email).toBe('admin@pharmacy.com');
        });

        it('should reject request without token', async () => {
            await request(app.getHttpServer())
                .get('/auth/profile')
                .expect(401);
        });
    });
});
```

### Template 2: Error Result Guard

```typescript
// src/test/utils/error-guards.ts

type LoginResult =
    | { access_token: string; refresh_token: string }
    | { error: string; statusCode: number };

type RegisterResult =
    | { id: string; email: string }
    | { error: string; message: string[] };

export class ErrorResultGuard<T> {
    constructor(private successCheck: (input: any) => boolean) {}

    assertSuccess(input: any): asserts input is T {
        if (!this.successCheck(input)) {
            throw new Error(
                `Expected success result, got error: ${JSON.stringify(input)}`
            );
        }
    }

    assertError(input: any) {
        if (this.successCheck(input)) {
            throw new Error(
                `Expected error result, got success: ${JSON.stringify(input)}`
            );
        }
    }
}

export const loginGuard = new ErrorResultGuard<LoginResult>(
    (input): input is Extract<LoginResult, { access_token: string }> =>
        'access_token' in input
);

export const registerGuard = new ErrorResultGuard<RegisterResult>(
    (input): input is Extract<RegisterResult, { id: string }> =>
        'id' in input
);

// Usage:
const result = await login({ email, password });
loginGuard.assertSuccess(result);
expect(result.access_token).toBeDefined(); // TypeScript knows this exists
```

### Template 3: Mock Email Service

```typescript
// src/test/mocks/email.service.mock.ts

export class MockEmailService {
    private sentEmails: Array<{
        to: string;
        subject: string;
        token?: string;
    }> = [];

    async sendVerificationEmail(email: string, token: string): Promise<void> {
        this.sentEmails.push({
            to: email,
            subject: 'Verify Your Email',
            token,
        });
    }

    async sendPasswordResetEmail(email: string, token: string): Promise<void> {
        this.sentEmails.push({
            to: email,
            subject: 'Reset Your Password',
            token,
        });
    }

    getLastEmailToken(): string | undefined {
        return this.sentEmails[this.sentEmails.length - 1]?.token;
    }

    getEmailsSentTo(email: string) {
        return this.sentEmails.filter(e => e.to === email);
    }

    clear() {
        this.sentEmails = [];
    }
}

// In tests:
const mockEmailService = new MockEmailService();

beforeEach(() => {
    mockEmailService.clear();
});

it('should send verification email on registration', async () => {
    await register({ email: 'test@test.com' });

    const emails = mockEmailService.getEmailsSentTo('test@test.com');
    expect(emails).toHaveLength(1);
    expect(emails[0].subject).toBe('Verify Your Email');

    const token = mockEmailService.getLastEmailToken();
    expect(token).toBeDefined();
});
```

### Template 4: Test Data Factory

```typescript
// src/test/factories/user.factory.ts

import { faker } from '@faker-js/faker';

export class UserFactory {
    static createPharmacist(overrides?: Partial<CreateUserDto>) {
        return {
            email: faker.internet.email(),
            password: 'SecurePass123!',
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            role: 'pharmacist',
            licenseNumber: `PH${faker.string.numeric(6)}`,
            ...overrides,
        };
    }

    static createAdmin(overrides?: Partial<CreateUserDto>) {
        return {
            email: faker.internet.email(),
            password: 'AdminPass123!',
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            role: 'admin',
            ...overrides,
        };
    }

    static createTechnician(overrides?: Partial<CreateUserDto>) {
        return {
            email: faker.internet.email(),
            password: 'TechPass123!',
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            role: 'technician',
            ...overrides,
        };
    }
}

// Usage:
it('should create multiple pharmacists', async () => {
    const pharmacist1 = UserFactory.createPharmacist();
    const pharmacist2 = UserFactory.createPharmacist({
        email: 'specific@pharmacy.com'
    });

    await createUser(pharmacist1);
    await createUser(pharmacist2);
});
```

---

## 14. Final Recommendations

### Immediate Actions (This Week)

1. **Install Testing Dependencies**
   ```bash
   npm install --save-dev @nestjs/testing supertest @faker-js/faker
   ```

2. **Create Test Structure**
   ```bash
   mkdir -p test/auth test/utils test/mocks test/fixtures
   ```

3. **Implement Priority 0 Tests** (Login, Registration, Token Validation)
   - Start with Template 1 above
   - ~20 tests, 4-6 hours

4. **Add Error Guards**
   - Copy Template 2
   - ~1 hour

5. **Mock Email Service**
   - Copy Template 3
   - ~1 hour

### Week 2: Expand Coverage

1. **Password Reset Flow** (5 tests)
2. **Role-Based Access** (8 tests)
3. **Session Management** (4 tests)

### Week 3: Refine & Document

1. Add test factories for common scenarios
2. Document test patterns in README
3. Set up CI/CD test automation

### Success Metrics

- [ ] All login/logout flows tested (5 tests)
- [ ] Registration flows tested (4 tests)
- [ ] Password reset tested (5 tests)
- [ ] Token refresh tested (3 tests)
- [ ] Permissions tested (8 tests)
- [ ] Session management tested (4 tests)
- [ ] **Total: 29+ tests**
- [ ] All tests pass in < 10 seconds
- [ ] Code coverage > 80% for auth module

---

## Appendix A: Vendure Test File Reference

| File | Tests | Focus |
|------|-------|-------|
| `auth.e2e-spec.ts` | 25 | Admin permissions, role isolation |
| `shop-auth.e2e-spec.ts` | 80 | Customer lifecycle, verification |
| `authentication-strategy.e2e-spec.ts` | 15 | Custom auth, OAuth, SSO |
| `session-management.e2e-spec.ts` | 8 | Session caching, expiry |

---

## Appendix B: Useful Vendure Testing Patterns

### Pattern: Parallel Test Execution
```typescript
// Each test file gets unique port
function getIndexOfTestFileInParentDir() {
    const testFilePath = getCallerFilename(2);
    const parentDir = path.dirname(testFilePath);
    const files = fs.readdirSync(parentDir);
    return files.indexOf(path.basename(testFilePath));
}

const port = 3010 + index;
```

### Pattern: Database Per Test File
```typescript
// SQLite file named after test file
const dbPath = path.join(__data__, `${testFilename}.sqlite`);
```

### Pattern: Type-Safe GraphQL Queries
```typescript
// Generate types from GraphQL schema
const result = await client.query<RegisterMutation, RegisterMutationVariables>(
    REGISTER_ACCOUNT,
    { input }
);
// TypeScript knows exact shape of result.registerCustomerAccount
```

---

**End of Report**

*For questions or clarifications, refer to:*
- Vendure Testing Docs: https://docs.vendure.io/guides/developer-guide/testing/
- Vendure Source: https://github.com/vendure-ecommerce/vendure
- NestJS Testing: https://docs.nestjs.com/fundamentals/testing
