import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { config } from './config.js';

let pool;

export async function initDb() {
  if (config.databaseUrl === 'memory') {
    const { newDb } = await import('pg-mem');
    const mem = newDb();
    const adapter = mem.adapters.createPg();
    pool = new adapter.Pool();
    console.log('Using an in-memory database (local development). Data is lost when the server stops.');
  } else {
    pool = new pg.Pool({ connectionString: config.databaseUrl, max: 5 });
    pool.on('error', (e) => console.error('Database connection error:', e.message));
    try {
      const { rows: [r] } = await pool.query('SELECT current_database() AS db, version() AS v');
      console.log(`Connected to PostgreSQL database "${r.db}" on ${new URL(config.databaseUrl).hostname} (${r.v.split(',')[0]})`);
    } catch (e) {
      throw new Error(`Could not connect to the database in DATABASE_URL: ${e.message}. Check the connection string in server/.env.`);
    }
  }
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  for (const statement of schema.split(/;\s*$/m).map((s) => s.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean)) {
    await pool.query(statement);
  }
}

export const query = (text, params) => pool.query(text, params);

// Runs fn(client) inside a transaction.
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
