import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1761383788873 implements MigrationInterface {
  name = 'Migrations1761383788873';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "operational"."authentication_methods" DROP CONSTRAINT "authentication_methods_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."sessions" DROP CONSTRAINT "sessions_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" DROP CONSTRAINT "user_roles_assigned_by_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" DROP CONSTRAINT "user_roles_role_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" DROP CONSTRAINT "user_roles_user_id_fkey"`,
    );
    await queryRunner.query(`DROP INDEX "operational"."idx_auth_methods_user"`);
    await queryRunner.query(
      `DROP INDEX "operational"."idx_auth_methods_identifier"`,
    );
    await queryRunner.query(`DROP INDEX "operational"."idx_auth_methods_type"`);
    await queryRunner.query(`DROP INDEX "operational"."idx_roles_code"`);
    await queryRunner.query(`DROP INDEX "operational"."idx_users_email"`);
    await queryRunner.query(`DROP INDEX "operational"."idx_users_deleted"`);
    await queryRunner.query(`DROP INDEX "operational"."idx_sessions_token"`);
    await queryRunner.query(`DROP INDEX "operational"."idx_sessions_user"`);
    await queryRunner.query(`DROP INDEX "operational"."idx_sessions_expires"`);
    await queryRunner.query(`DROP INDEX "operational"."idx_sessions_active"`);
    await queryRunner.query(`DROP INDEX "operational"."idx_user_roles_user"`);
    await queryRunner.query(`DROP INDEX "operational"."idx_user_roles_role"`);
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" DROP CONSTRAINT "user_roles_user_id_role_id_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."users" DROP CONSTRAINT "users_email_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."users" DROP COLUMN "email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" DROP CONSTRAINT "user_roles_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" DROP COLUMN "user_role_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" DROP COLUMN "assigned_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" DROP COLUMN "assigned_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" ADD CONSTRAINT "PK_23ed6f04fe43066df08379fd034" PRIMARY KEY ("user_id", "role_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."users" ALTER COLUMN "username" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."users" ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4df3bc11f97b76aedad5ef9ab1" ON "operational"."authentication_methods" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON "operational"."user_roles" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "operational"."user_roles" ("role_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."authentication_methods" ADD CONSTRAINT "FK_22d529554355d519e9472b6071e" FOREIGN KEY ("user_id") REFERENCES "operational"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."sessions" ADD CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19" FOREIGN KEY ("user_id") REFERENCES "operational"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "operational"."users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY ("role_id") REFERENCES "operational"."roles"("role_id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" DROP CONSTRAINT "FK_b23c65e50a758245a33ee35fda1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" DROP CONSTRAINT "FK_87b8888186ca9769c960e926870"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."sessions" DROP CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."authentication_methods" DROP CONSTRAINT "FK_22d529554355d519e9472b6071e"`,
    );
    await queryRunner.query(
      `DROP INDEX "operational"."IDX_b23c65e50a758245a33ee35fda"`,
    );
    await queryRunner.query(
      `DROP INDEX "operational"."IDX_87b8888186ca9769c960e92687"`,
    );
    await queryRunner.query(
      `DROP INDEX "operational"."IDX_4df3bc11f97b76aedad5ef9ab1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."users" DROP CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."users" ALTER COLUMN "username" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" DROP CONSTRAINT "PK_23ed6f04fe43066df08379fd034"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" ADD "assigned_by_user_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" ADD "assigned_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" ADD "user_role_id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_role_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."users" ADD "email" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."users" ADD CONSTRAINT "users_email_key" UNIQUE ("email")`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" ADD CONSTRAINT "user_roles_user_id_role_id_key" UNIQUE ("user_id", "role_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_roles_role" ON "operational"."user_roles" ("role_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_roles_user" ON "operational"."user_roles" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sessions_active" ON "operational"."sessions" ("invalidated_at", "user_id") WHERE (invalidated_at IS NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sessions_expires" ON "operational"."sessions" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sessions_user" ON "operational"."sessions" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_sessions_token" ON "operational"."sessions" ("token") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_deleted" ON "operational"."users" ("deleted_at") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_email" ON "operational"."users" ("email") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_roles_code" ON "operational"."roles" ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_methods_type" ON "operational"."authentication_methods" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_methods_identifier" ON "operational"."authentication_methods" ("identifier") WHERE (identifier IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_methods_user" ON "operational"."authentication_methods" ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "operational"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "operational"."roles"("role_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."user_roles" ADD CONSTRAINT "user_roles_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "operational"."users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "operational"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational"."authentication_methods" ADD CONSTRAINT "authentication_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "operational"."users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
