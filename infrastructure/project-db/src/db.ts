import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;
if (!process.env.PROJECT_DATABASE_URL) throw new Error('PROJECT_DATABASE_URL is required');
export const pool = new Pool({ connectionString: process.env.PROJECT_DATABASE_URL, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values: unknown[] = []) { return pool.query<T>(text, values); }
