import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import cookieSession from 'cookie-session';

/**
 * Create a test application instance
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Apply same middleware as production
  // Use the same session secret as production (from env or default)
  app.use(
    cookieSession({
      name: 'session',
      keys: [
        process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
      ],
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: false, // false for testing
      sameSite: 'lax',
    }),
  );

  // Enable validation pipes like in production
  app.useGlobalPipes(new ValidationPipe());

  // Enable CORS for testing
  app.enableCors({
    origin: 'http://localhost:3001',
    credentials: true,
  });

  await app.init();
  return app;
}

/**
 * Clean up test database - truncate all tables
 */
export async function cleanDatabase(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);

  const entities = dataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.query(
      `TRUNCATE TABLE ${entity.schema}.${entity.tableName} RESTART IDENTITY CASCADE;`,
    );
  }
}

/**
 * Seed initial data needed for tests
 */
export async function seedDatabase(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);

  // Insert default roles
  await dataSource.query(`
    INSERT INTO operational.roles (code, name, description, permissions, is_system, created_at, updated_at)
    VALUES
      ('pharmacist', 'Pharmacist', 'Pharmacist role', '{}', false, NOW(), NOW()),
      ('admin', 'Administrator', 'Administrator role', '{}', false, NOW(), NOW()),
      ('technician', 'Technician', 'Technician role', '{}', false, NOW(), NOW())
    ON CONFLICT (code) DO NOTHING;
  `);
}

/**
 * Extract cookies from response headers
 */
export function extractCookie(
  response: any,
  cookieName: string = 'session',
): string | null {
  const cookies = response.headers['set-cookie'];
  if (!cookies) return null;

  const cookie = cookies.find((c: string) => c.startsWith(`${cookieName}=`));
  if (!cookie) return null;

  return cookie.split(';')[0];
}

/**
 * Helper to wait for async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
