import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Drug } from '../drugs/entities/drug.entity';
import { DosageForm } from '../drugs/entities/dosage-form.entity';
import { Route } from '../drugs/entities/route.entity';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [Drug, DosageForm, Route],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
