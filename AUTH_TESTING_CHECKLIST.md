# Authentication Testing Implementation Checklist

**Project:** Meditory Pharmacy ERP
**Based on:** Vendure Testing Analysis
**Timeline:** 3 weeks

---

## Week 1: Foundation Setup (8-10 hours)

### Day 1-2: Infrastructure Setup (3 hours)

- [ ] **Install Dependencies**
  ```bash
  npm install --save-dev @nestjs/testing supertest @faker-js/faker
  npm install --save-dev @types/supertest
  ```

- [ ] **Create Test Directory Structure**
  ```bash
  mkdir -p test/auth
  mkdir -p test/utils
  mkdir -p test/mocks
  mkdir -p test/fixtures
  ```

- [ ] **Create Base Test Files**
  - [ ] `test/auth/auth.e2e-spec.ts`
  - [ ] `test/utils/test-helpers.ts`
  - [ ] `test/utils/error-guards.ts`
  - [ ] `test/mocks/email.service.mock.ts`

- [ ] **Configure Jest/Vitest for E2E Tests**
  - [ ] Update `package.json` scripts
  - [ ] Create `test/jest-e2e.json` or `vitest.config.ts`
  - [ ] Configure test database (separate from dev)

### Day 3-4: Core Auth Tests (5 hours)

- [ ] **Login Tests** (5 tests)
  - [ ] ✅ Should login with valid credentials
  - [ ] ✅ Should reject invalid password
  - [ ] ✅ Should reject non-existent email
  - [ ] ✅ Should return access_token and refresh_token
  - [ ] ✅ Should reject unverified user

- [ ] **Registration Tests** (4 tests)
  - [ ] ✅ Should register new user
  - [ ] ✅ Should reject weak password
  - [ ] ✅ Should reject duplicate email
  - [ ] ✅ Should send verification email

- [ ] **Token Validation Tests** (3 tests)
  - [ ] ✅ Should access protected route with valid token
  - [ ] ✅ Should reject invalid token
  - [ ] ✅ Should reject missing token

### Day 5: Utilities & Helpers (2 hours)

- [ ] **Implement Error Guards**
  - [ ] Create `LoginResultGuard`
  - [ ] Create `RegisterResultGuard`
  - [ ] Create `PasswordResetResultGuard`

- [ ] **Implement Test Helpers**
  - [ ] `createTestApp()` function
  - [ ] `createUserWithRole()` function
  - [ ] `cleanupDatabase()` function

- [ ] **Mock Email Service**
  - [ ] Implement `MockEmailService` class
  - [ ] Add token capture methods
  - [ ] Add email history tracking

---

## Week 2: Extended Coverage (12-14 hours)

### Day 1-2: Password Reset Flow (4 hours)

- [ ] **Password Reset Tests** (5 tests)
  - [ ] ✅ Should request password reset
  - [ ] ✅ Should send reset email with token
  - [ ] ✅ Should silently succeed for non-existent email (anti-enumeration)
  - [ ] ✅ Should reset password with valid token
  - [ ] ✅ Should reject invalid/expired token

- [ ] **Password Reset Edge Cases** (3 tests)
  - [ ] ✅ Should reject weak password on reset
  - [ ] ✅ Should invalidate old tokens after use
  - [ ] ✅ Should allow login with new password

### Day 3-4: Permissions & Roles (5 hours)

- [ ] **Create Test Users**
  - [ ] Admin user fixture
  - [ ] Pharmacist user fixture
  - [ ] Technician user fixture

- [ ] **Permission Tests** (8 tests)
  - [ ] ✅ Admin can create drugs
  - [ ] ✅ Admin can delete drugs
  - [ ] ✅ Pharmacist can view drugs
  - [ ] ✅ Pharmacist can approve prescriptions
  - [ ] ✅ Pharmacist cannot delete drugs
  - [ ] ✅ Technician can view prescriptions
  - [ ] ✅ Technician cannot approve prescriptions
  - [ ] ✅ Technician cannot access admin routes

- [ ] **Create Permission Test Helper**
  - [ ] `testPermission(role, resource, action, shouldSucceed)` function

### Day 5: Session Management (3 hours)

- [ ] **Session Tests** (4 tests)
  - [ ] ✅ Should maintain session across requests
  - [ ] ✅ Should invalidate session on logout
  - [ ] ✅ Should expire session after timeout
  - [ ] ✅ Should extend session on activity

- [ ] **Token Refresh Tests** (3 tests)
  - [ ] ✅ Should refresh access token with valid refresh token
  - [ ] ✅ Should reject invalid refresh token
  - [ ] ✅ Should invalidate refresh token after logout

---

## Week 3: Refinement & Security (8-10 hours)

### Day 1-2: Security Tests (4 hours)

- [ ] **Account Enumeration Prevention** (3 tests)
  - [ ] ✅ Login error message doesn't reveal if email exists
  - [ ] ✅ Password reset success message same for all emails
  - [ ] ✅ Registration doesn't reveal duplicate emails

- [ ] **Token Security** (4 tests)
  - [ ] ✅ Should reject tampered tokens
  - [ ] ✅ Should reject expired tokens
  - [ ] ✅ Should reject tokens after password change
  - [ ] ✅ Should reject reused refresh tokens

- [ ] **Rate Limiting** (2 tests)
  - [ ] ✅ Should rate limit login attempts
  - [ ] ✅ Should rate limit password reset requests

### Day 3: Email Verification Flow (3 hours)

- [ ] **Email Verification Tests** (5 tests)
  - [ ] ✅ Should send verification email on registration
  - [ ] ✅ Should verify email with valid token
  - [ ] ✅ Should reject invalid verification token
  - [ ] ✅ Should reject expired verification token
  - [ ] ✅ Should allow login only after verification

- [ ] **Resend Verification** (2 tests)
  - [ ] ✅ Should resend verification email
  - [ ] ✅ Should invalidate old token when new one sent

### Day 4-5: Documentation & CI Setup (3 hours)

- [ ] **Documentation**
  - [ ] Create `test/README.md` with testing guide
  - [ ] Document test patterns and conventions
  - [ ] Add inline comments to complex tests

- [ ] **CI/CD Setup**
  - [ ] Add GitHub Actions workflow for tests
  - [ ] Configure test database in CI
  - [ ] Add test coverage reporting

- [ ] **Final Review**
  - [ ] Run all tests and ensure 100% pass rate
  - [ ] Verify test execution time < 30 seconds
  - [ ] Check code coverage > 80% for auth module

---

## Test Count Summary

| Category | Test Count | Status |
|----------|-----------|--------|
| Login/Logout | 5 | ⏳ Pending |
| Registration | 4 | ⏳ Pending |
| Token Validation | 3 | ⏳ Pending |
| Password Reset | 8 | ⏳ Pending |
| Permissions | 8 | ⏳ Pending |
| Sessions | 4 | ⏳ Pending |
| Refresh Tokens | 3 | ⏳ Pending |
| Security | 9 | ⏳ Pending |
| Email Verification | 7 | ⏳ Pending |
| **TOTAL** | **51 tests** | **0/51** |

---

## Success Criteria

### Code Quality
- [ ] All 51 tests passing
- [ ] Test coverage > 80% for auth module
- [ ] No console errors or warnings during tests
- [ ] All async operations properly awaited

### Performance
- [ ] All tests complete in < 30 seconds
- [ ] No memory leaks detected
- [ ] Database properly cleaned between tests

### Security
- [ ] All security edge cases covered
- [ ] No sensitive data logged in tests
- [ ] Account enumeration prevention verified
- [ ] Token security validated

### Documentation
- [ ] All test files have descriptive names
- [ ] Complex test logic is commented
- [ ] Test utilities documented
- [ ] README with setup instructions

---

## Quick Start

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Test Suite
```bash
npm run test:e2e -- test/auth/auth.e2e-spec.ts
```

### Run with Coverage
```bash
npm run test:cov
```

### Watch Mode (Development)
```bash
npm run test:watch
```

---

## Common Issues & Solutions

### Issue: Database Not Cleaning Between Tests
**Solution:** Add `afterEach` hook to truncate tables
```typescript
afterEach(async () => {
    await cleanupDatabase(app);
});
```

### Issue: Tests Timeout
**Solution:** Increase timeout for database operations
```typescript
jest.setTimeout(30000); // 30 seconds
```

### Issue: Port Already in Use
**Solution:** Use dynamic port allocation
```typescript
const port = await getAvailablePort();
```

### Issue: Email Mock Not Working
**Solution:** Ensure mock is registered before app initialization
```typescript
const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
})
    .overrideProvider(EmailService)
    .useValue(mockEmailService)
    .compile();
```

---

## Resources

- **Vendure Testing Analysis:** `VENDURE_AUTH_TESTING_ANALYSIS.md`
- **NestJS Testing Docs:** https://docs.nestjs.com/fundamentals/testing
- **Supertest Docs:** https://github.com/ladjs/supertest
- **Vitest Docs:** https://vitest.dev/guide/
- **Faker.js Docs:** https://fakerjs.dev/guide/

---

**Last Updated:** 2025-10-16
**Maintained by:** Development Team
