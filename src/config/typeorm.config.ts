import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Drug } from '../drugs/entities/drug.entity';
import { DosageForm } from '../drugs/entities/dosage-form.entity';
import { Route } from '../drugs/entities/route.entity';
import { Session } from '../auth/entities/session.entity';
import { AuthenticationMethod } from '../auth/entities/authentication-method.entity';
import { ExternalAuthenticationMethod } from '../auth/entities/external-authentication-method.entity';
import { NativeAuthenticationMethod } from '../auth/entities/native-authentication-method.entity';
import { Role } from '../auth/entities/role.entity';
import { User } from '../auth/entities/user.entity';
import { Pharmacy } from '../inventory/entities/pharmacy.entity';
import { PharmacyStock } from '../inventory/entities/pharmacy-stock.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
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
    Pharmacy,
    PharmacyStock,
    StockMovement,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
