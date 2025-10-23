import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  createTestApp,
  cleanDatabase,
  seedDatabase,
  extractCookie,
} from '../utils/test-helpers';
import {
  loginGuard,
  registerGuard,
  userGuard,
  successGuard,
} from '../utils/error-guards';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let sessionCookie: string;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
    await seedDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Clean up between tests
    await cleanDatabase(app);
    await seedDatabase(app);
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'pharmacist@meditory.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201);

      expect(response.body.user.email).toBe('pharmacist@meditory.com');
      expect(response.body.user.verified).toBe(false);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@meditory.com',
          password: '123', // Too weak
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject registration with duplicate email', async () => {
      // Create first user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@meditory.com',
          password: 'SecurePass123!',
          firstName: 'First',
          lastName: 'User',
        })
        .expect(201);

      // Try to create duplicate
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@meditory.com',
          password: 'SecurePass123!',
          firstName: 'Second',
          lastName: 'User',
        })
        .expect(409);

      expect(response.body.message).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    const testUser = {
      email: 'login-test@meditory.com',
      password: 'SecurePass123!',
      firstName: 'Login',
      lastName: 'Test',
    };

    beforeEach(async () => {
      // Register and verify user for login tests
      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      // Manually verify user in database (since we don't have email service)
      // DataSource already imported at top
      const dataSource = app.get(DataSource);
      await dataSource.query(
        `UPDATE operational.users SET verified = true WHERE email = $1`,
        [testUser.email],
      );
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login') // Returns 200
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      loginGuard.assertSuccess(response.body);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.token).toBeDefined();
      expect(response.body.success).toBe(true);

      // Check that session cookie was set
      const cookie = extractCookie(response);
      expect(cookie).toBeTruthy();
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login') // Returns 200
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.message).toBeDefined();
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login') // Returns 200
        .send({
          email: 'nonexistent@meditory.com',
          password: 'SecurePass123!',
        })
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    it('should reject login for unverified user', async () => {
      // Create unverified user
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'unverified@meditory.com',
        password: 'SecurePass123!',
        firstName: 'Unverified',
        lastName: 'User',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login') // Returns 200
        .send({
          email: 'unverified@meditory.com',
          password: 'SecurePass123!',
        })
        .expect(401);

      expect(response.body.message).toBeDefined();
      expect(response.body.message).toContain('not verified');
    });

    it('should save session and allow subsequent authenticated requests', async () => {
      // Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login') // Returns 200
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      loginGuard.assertSuccess(loginResponse.body);
      sessionCookie = extractCookie(loginResponse)!;
      expect(sessionCookie).toBeTruthy();

      // Use session to access protected route
      const meResponse = await request(app.getHttpServer())
        .get('/auth/me') // Returns 200
        .set('Cookie', sessionCookie)
        .expect(200);

      userGuard.assertSuccess(meResponse.body);
      expect(meResponse.body.email).toBe(testUser.email);
    });
  });

  describe('GET /auth/me', () => {
    const testUser = {
      email: 'me-test@meditory.com',
      password: 'SecurePass123!',
      firstName: 'Me',
      lastName: 'Test',
    };

    beforeEach(async () => {
      // Register and verify user
      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      // DataSource already imported at top
      const dataSource = app.get(DataSource);
      await dataSource.query(
        `UPDATE operational.users SET verified = true WHERE email = $1`,
        [testUser.email],
      );

      // Login to get session
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login') // Returns 200
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      sessionCookie = extractCookie(loginResponse)!;
    });

    it('should return current user with valid session', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me') // Returns 200
        .set('Cookie', sessionCookie)
        .expect(200);

      userGuard.assertSuccess(response.body);
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.firstName).toBe(testUser.firstName);
      expect(response.body.password).toBeUndefined();
    });

    it('should reject request without session', async () => {
      await request(app.getHttpServer())
        .get('/auth/me') // Returns 200
        .expect(401);
    });

    it('should reject request with invalid session', async () => {
      await request(app.getHttpServer())
        .get('/auth/me') // Returns 200
        .set('Cookie', 'session=invalid-session-token')
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    const testUser = {
      email: 'logout-test@meditory.com',
      password: 'SecurePass123!',
      firstName: 'Logout',
      lastName: 'Test',
    };

    beforeEach(async () => {
      // Register, verify, and login
      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      // DataSource already imported at top
      const dataSource = app.get(DataSource);
      await dataSource.query(
        `UPDATE operational.users SET verified = true WHERE email = $1`,
        [testUser.email],
      );

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login') // Returns 200
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      sessionCookie = extractCookie(loginResponse)!;
    });

    it('should logout successfully and invalidate session', async () => {
      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout') // Returns 200
        .set('Cookie', sessionCookie)
        .expect(200);

      // Try to use old session - should fail
      await request(app.getHttpServer())
        .get('/auth/me') // Returns 200
        .set('Cookie', sessionCookie)
        .expect(401);
    });

    it('should reject logout without session', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout') // Returns 200
        .expect(401);
    });
  });

  describe('POST /auth/request-password-reset', () => {
    const testUser = {
      email: 'reset-test@meditory.com',
      password: 'SecurePass123!',
      firstName: 'Reset',
      lastName: 'Test',
    };

    beforeEach(async () => {
      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      // DataSource already imported at top
      const dataSource = app.get(DataSource);
      await dataSource.query(
        `UPDATE operational.users SET verified = true WHERE email = $1`,
        [testUser.email],
      );
    });

    it('should return success for existing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: testUser.email })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
    });

    it('should return success for non-existent email (anti-enumeration)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: 'nonexistent@meditory.com' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
    });

    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('POST /auth/reset-password', () => {
    const testUser = {
      email: 'password-change@meditory.com',
      password: 'OldPassword123!',
      firstName: 'Password',
      lastName: 'Change',
    };

    let resetToken: string;

    beforeEach(async () => {
      // Register and verify user
      await request(app.getHttpServer()).post('/auth/register').send(testUser);

      // DataSource already imported at top
      const dataSource = app.get(DataSource);
      await dataSource.query(
        `UPDATE operational.users SET verified = true WHERE email = $1`,
        [testUser.email],
      );

      // Request password reset
      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: testUser.email });

      // Get reset token from database (in real app, this comes from email)
      const result = await dataSource.query(
        `SELECT password_reset_token FROM operational.authentication_methods
         WHERE identifier = $1`,
        [testUser.email],
      );

      resetToken = result[0].password_reset_token;
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword123!';

      // Reset password
      await request(app.getHttpServer())
        .post('/auth/reset-password') // Returns 200
        .send({
          token: resetToken,
          password: newPassword,
        })
        .expect(200);

      // Login with new password should work
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login') // Returns 200
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200);

      loginGuard.assertSuccess(loginResponse.body);
    });

    it('should reject reset with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password') // Returns 200
        .send({
          token: 'invalid-token-1234567890',
          password: 'NewPassword123!',
        })
        .expect(400);
    });

    it('should reject reset with weak password', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password') // Returns 200
        .send({
          token: resetToken,
          password: '123', // Too weak
        })
        .expect(400);
    });

    it('should invalidate token after successful reset', async () => {
      // Reset password
      await request(app.getHttpServer())
        .post('/auth/reset-password') // Returns 200
        .send({
          token: resetToken,
          password: 'NewPassword123!',
        })
        .expect(200);

      // Try to use same token again - should fail
      await request(app.getHttpServer())
        .post('/auth/reset-password') // Returns 200
        .send({
          token: resetToken,
          password: 'AnotherPassword123!',
        })
        .expect(400);
    });

    it('should invalidate all sessions after password reset', async () => {
      // Login to create a session
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login') // Returns 200
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const oldSessionCookie = extractCookie(loginResponse)!;

      // Verify session works
      await request(app.getHttpServer())
        .get('/auth/me') // Returns 200
        .set('Cookie', oldSessionCookie)
        .expect(200);

      // Reset password
      await request(app.getHttpServer())
        .post('/auth/reset-password') // Returns 200
        .send({
          token: resetToken,
          password: 'NewPassword123!',
        });

      // Old session should be invalid now
      await request(app.getHttpServer())
        .get('/auth/me') // Returns 200
        .set('Cookie', oldSessionCookie)
        .expect(401);
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive user data in responses', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'security@meditory.com',
          password: 'SecurePass123!',
          firstName: 'Security',
          lastName: 'Test',
        });

      expect(response.body.password).toBeUndefined();
      expect(response.body.passwordHash).toBeUndefined();
      expect(response.body.verificationToken).toBeUndefined();
      expect(response.body.passwordResetToken).toBeUndefined();
    });

    it('should use consistent error messages to prevent enumeration', async () => {
      // Try login with non-existent user
      const response1 = await request(app.getHttpServer())
        .post('/auth/login') // Returns 200
        .send({
          email: 'nonexistent@meditory.com',
          password: 'SecurePass123!',
        })
        .expect(401);

      // Try login with wrong password for existing user
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'exists@meditory.com',
        password: 'SecurePass123!',
        firstName: 'Exists',
        lastName: 'User',
      });

      const response2 = await request(app.getHttpServer())
        .post('/auth/login') // Returns 200
        .send({
          email: 'exists@meditory.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      // Error messages should be the same
      expect(response1.body.error).toBe(response2.body.error);
    });
  });
});
