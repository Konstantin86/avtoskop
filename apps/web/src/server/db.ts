import 'server-only';
import { createDb, type Db } from '@avtoskop/db';

const globalForDb = globalThis as unknown as { avtoskopDb?: Db };

function connect(): Db {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL is not set');
  return createDb(url).db;
}

// One pool per process; dev hot reloads would otherwise open a new pool each time.
// The pool opens on first use, so `next build` works without a database.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = (globalForDb.avtoskopDb ??= connect());
    const value = Reflect.get(real, prop, real) as unknown;
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
