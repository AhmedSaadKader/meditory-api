import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthTables1760592705768 implements MigrationInterface {
  name = 'CreateAuthTables1760592705768';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create users table
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

    // 2. Create authentication_methods table
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

    // 3. Create sessions table
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

    // 4. Create roles table
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

    // 5. Create user_roles join table
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

    // 6. Create audit_logs table (optional - for compliance)
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

    // Create indexes for users table
    await queryRunner.query(
      `CREATE INDEX idx_users_email ON operational.users(email)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_users_deleted ON operational.users(deleted_at) WHERE deleted_at IS NULL`,
    );

    // Create indexes for authentication_methods table
    await queryRunner.query(
      `CREATE INDEX idx_auth_methods_user ON operational.authentication_methods(user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_auth_methods_type ON operational.authentication_methods(type)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_auth_methods_identifier ON operational.authentication_methods(identifier) WHERE identifier IS NOT NULL`,
    );

    // Create indexes for sessions table
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_sessions_token ON operational.sessions(token)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_sessions_user ON operational.sessions(user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_sessions_expires ON operational.sessions(expires_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_sessions_active ON operational.sessions(user_id, invalidated_at) WHERE invalidated_at IS NULL`,
    );

    // Create indexes for roles table
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_roles_code ON operational.roles(code)`,
    );

    // Create indexes for user_roles table
    await queryRunner.query(
      `CREATE INDEX idx_user_roles_user ON operational.user_roles(user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_user_roles_role ON operational.user_roles(role_id)`,
    );

    // Create indexes for audit_logs table
    await queryRunner.query(
      `CREATE INDEX idx_audit_logs_user ON operational.audit_logs(user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_audit_logs_action ON operational.audit_logs(action)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_audit_logs_resource ON operational.audit_logs(resource_type, resource_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_audit_logs_created ON operational.audit_logs(created_at DESC)`,
    );

    // Seed default roles
    await queryRunner.query(`
      INSERT INTO operational.roles (code, name, description, permissions, is_system)
      VALUES
        ('superadmin', 'Super Administrator', 'Full system access', ARRAY['SuperAdmin'], true),
        ('pharmacist', 'Pharmacist', 'Dispense medications, manage inventory', ARRAY['ReadDrug', 'ReadPrescription', 'DispensePrescription', 'ReadInventory', 'UpdateInventory'], false),
        ('pharmacy_admin', 'Pharmacy Administrator', 'Pharmacy management and reports', ARRAY['ReadDrug', 'ReadPrescription', 'ReadInventory', 'UpdateInventory', 'ViewSalesReports', 'ViewInventoryReports', 'CreateUser', 'ReadUser', 'UpdateUser', 'ManageRoles'], false)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respect foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS operational.audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS operational.user_roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS operational.roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS operational.sessions`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS operational.authentication_methods`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS operational.users`);
  }
}
