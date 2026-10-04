import { readFileSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: process.env.PROJECT_ENV_FILE || '/home/ryukomik/ryukomik-project-db/.env', quiet: true });
const connection = new URL(process.env.PROJECT_DATABASE_URL);
const backup = process.env.PREMIUM_LOCK_BACKUP;
if (!backup) throw new Error('PREMIUM_LOCK_BACKUP must be an explicit backup path.');
const dumped = spawnSync('pg_dump', ['-h', connection.hostname, '-p', connection.port || '5432', '-U', decodeURIComponent(connection.username), '-d', connection.pathname.slice(1), '-Fc', '-f', backup], { env: { ...process.env, PGPASSWORD: decodeURIComponent(connection.password) }, stdio: 'inherit' });
if (dumped.status !== 0) throw new Error('Database backup failed; migration not applied.');
chmodSync(backup, 0o600);
const pool = new pg.Pool({ connectionString: process.env.PROJECT_DATABASE_URL });
try {
  const sql = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../database/premium-lock.sql'), 'utf8');
  try { await pool.query(sql); }
  catch (error) {
    await pool.query('rollback');
    if (error.code !== '42501') throw error;
    // The application role deliberately does not own the production tables.
    const applied = spawnSync('sudo', ['-n', '-u', 'postgres', 'psql', '-d', connection.pathname.slice(1), '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] });
    if (applied.status !== 0) throw new Error('Backup created; schema requires the PostgreSQL table owner.');
  }
  const result = await pool.query('select count(*) filter(where premium_lock_until>now())::int active_locks,count(*) filter(where login_lock_until is not null)::int legacy_locks from project_chapters');
  console.log('Premium lock schema ready:', result.rows[0]);
} finally { await pool.end(); }
