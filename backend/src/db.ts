import { Pool } from 'pg';
import 'dotenv/config';
import { databaseUrl } from './config';
export const pool = new Pool({ connectionString: databaseUrl(process.env.DATABASE_URL) });
