import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { User } from './entities/user.entity';
import { AuthenticationMethod } from './entities/authentication-method.entity';
import { NativeAuthenticationMethod } from './entities/native-authentication-method.entity';
import { ExternalAuthenticationMethod } from './entities/external-authentication-method.entity';
import { Session } from './entities/session.entity';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { AuditLog } from './entities/audit-log.entity';

// Services
import { PasswordCipherService } from './services/password-cipher.service';
import { SessionService } from './services/session.service';
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { RoleService } from './services/role.service';

// Strategies
import { NativeAuthenticationStrategy } from './strategies/native-authentication.strategy';

// Guards
import { AuthGuard } from './guards/auth.guard';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AuthenticationMethod,
      NativeAuthenticationMethod,
      ExternalAuthenticationMethod,
      Session,
      Role,
      UserRole,
      AuditLog,
    ]),
  ],
  providers: [
    // Services
    PasswordCipherService,
    SessionService,
    AuthService,
    UserService,
    RoleService,

    // Strategies
    NativeAuthenticationStrategy,

    // Guards
    AuthGuard,
  ],
  controllers: [AuthController, UserController],
  exports: [
    AuthService,
    SessionService,
    UserService,
    RoleService,
    AuthGuard,
  ],
})
export class AuthModule {}
