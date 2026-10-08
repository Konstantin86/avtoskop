import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { rmSync } from 'node:fs';
import postgres from 'postgres';
import {
  ADMIN_DATABASE_URL,
  appEnv,
  BASE_URL,
  DEV_DATABASE_URL,
  PHOTO_DIR,
  ROOT,
  TEST_DATABASE_URL,
  WEB_PORT,
} from './env.ts';
import { startFakeTelegram } from './fake-telegram.ts';

export const WANTED_VIN = 'TMBJG7NE5K0999999';

// A fresh database: migrations, the brand and model lists from the dev database, and one
// wanted car so the VIN warning can be checked.
async function resetDatabase() {
  const admin = postgres(ADMIN_DATABASE_URL, { max: 1, onnotice: () => {} });
  await admin.unsafe(
    `select pg_terminate_backend(pid) from pg_stat_activity where datname = 'avtoskop_e2e'`,
  );
  await admin.unsafe('drop database if exists avtoskop_e2e');
  await admin.unsafe('create database avtoskop_e2e');
  await admin.end();

  const migrated = spawnSync('node', ['src/migrate.ts'], {
    cwd: `${ROOT}packages/db`,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
  if (migrated.status !== 0) throw new Error('Migrations failed');

  const dev = postgres(DEV_DATABASE_URL, { max: 1 });
  const test = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  const brands = await dev`select id, name, slug, autoria_id from brands`;
  const models = await dev`select id, brand_id, name, slug, autoria_id from models`;
  for (let i = 0; i < brands.length; i += 500)
    await test`insert into brands ${test(brands.slice(i, i + 500))}`;
  for (let i = 0; i < models.length; i += 500)
    await test`insert into models ${test(models.slice(i, i + 500))}`;
  await test.unsafe(`select setval('brands_id_seq', (select max(id) from brands))`);
  await test.unsafe(`select setval('models_id_seq', (select max(id) from models))`);
  await test`insert into wanted_vehicles (vin, brand_model) values (${WANTED_VIN}, 'SKODA OCTAVIA')`;
  await test`insert into data_snapshots (source, as_of, rows) values ('mvs_wanted', now(), 1)`;
  await dev.end();
  await test.end();
}

async function waitFor(url: string, ms = 60_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`${url} did not start`);
}

export default async function globalSetup() {
  await resetDatabase();
  rmSync(PHOTO_DIR, { recursive: true, force: true });
  const telegram = startFakeTelegram();
  const children: ChildProcess[] = [
    spawn('node_modules/.bin/next', ['start', '--port', String(WEB_PORT)], {
      cwd: `${ROOT}apps/web`,
      env: appEnv(),
      stdio: process.env['E2E_LOGS'] ? 'inherit' : 'ignore',
    }),
    spawn('node', ['src/bot/main.ts'], {
      cwd: `${ROOT}apps/jobs`,
      env: appEnv(),
      stdio: process.env['E2E_LOGS'] ? 'inherit' : 'ignore',
    }),
  ];
  await waitFor(`${BASE_URL}/ua`);
  return async () => {
    for (const child of children) child.kill('SIGTERM');
    telegram.close();
  };
}
