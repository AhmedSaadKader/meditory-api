import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DrugsModule } from './drugs/drugs.module';
import { Drug } from './drugs/entities/drug.entity';
import { DosageForm } from './drugs/entities/dosage-form.entity';
import { Route } from './drugs/entities/route.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/guards/auth.guard';

// Auth entities
import { User } from './auth/entities/user.entity';
import { AuthenticationMethod } from './auth/entities/authentication-method.entity';
import { NativeAuthenticationMethod } from './auth/entities/native-authentication-method.entity';
import { ExternalAuthenticationMethod } from './auth/entities/external-authentication-method.entity';
import { Session } from './auth/entities/session.entity';
import { Role } from './auth/entities/role.entity';
import { UserRole } from './auth/entities/user-role.entity';
import { AuditLog } from './auth/entities/audit-log.entity';
import { Organization } from './auth/entities/organization.entity';
import { InventoryModule } from './inventory/inventory.module';

// Inventory entities
import { Pharmacy } from './inventory/entities/pharmacy.entity';
import { PharmacyStock } from './inventory/entities/pharmacy-stock.entity';
import { StockMovement } from './inventory/entities/stock-movement.entity';
import { SalesPurchaseModule } from './sales-purchase/sales-purchase.module';

// Sales-Purchase entities
import { Supplier } from './sales-purchase/entities/supplier.entity';
import { Customer } from './sales-purchase/entities/customer.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const useSSL = configService.get<string>('DB_SSL') === 'true';

        const config: TypeOrmModuleOptions = {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST'),
          port: parseInt(configService.get<string>('DB_PORT') || '5432'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
          entities: [
            Drug,
            DosageForm,
            Route,
            User,
            AuthenticationMethod,
            NativeAuthenticationMethod,
            ExternalAuthenticationMethod,
            Session,
            Role,
            UserRole,
            AuditLog,
            Organization,
            Pharmacy,
            PharmacyStock,
            StockMovement,
            Supplier,
            Customer,
          ],
          synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',
          ...(useSSL && {
            ssl: true,
            extra: {
              ssl: {
                rejectUnauthorized: false,
              },
            },
          }),
        };

        return config;
      },
    }),
    DrugsModule,
    AuthModule,
    InventoryModule,
    SalesPurchaseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {
  constructor(private datasource: DataSource) {}
}
