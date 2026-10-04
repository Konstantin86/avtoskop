import 'server-only';
import { createDb, type Db } from '@avtoskop/db';

const globalForDb = globalThis as unknown as { avtoskopDb?: Db };

function connect(): Db {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL is not set');
  return createDb(url).db;
}

// One pool per process; dev hot reloads would otherwise open a new pool each time.
export const db: Db = globalForDb.avtoskopDb ?? (globalForDb.avtoskopDb = connect());
