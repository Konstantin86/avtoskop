import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Everything the test run needs, derived from the local .env so no extra setup is required.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const dotenv = Object.fromEntries(
  readFileSync(`${root}.env`, 'utf8')
    .split('\n')
    .flatMap((line) => {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      return m ? [[m[1]!, m[2]!]] : [];
    }),
);

const devDb = dotenv['DATABASE_URL'];
if (!devDb) throw new Error('DATABASE_URL is missing in .env');

export const ROOT = root;
export const DEV_DATABASE_URL = devDb;
// A separate database on the same local Postgres, rebuilt for every run.
export const TEST_DATABASE_URL = devDb.replace(/\/[^/?]+(\?|$)/, '/avtoskop_e2e$1');
export const ADMIN_DATABASE_URL = devDb.replace(/\/[^/?]+(\?|$)/, '/postgres$1');

export const WEB_PORT = 3100;
export const TELEGRAM_PORT = 3900;
export const BASE_URL = `http://localhost:${WEB_PORT}`;
export const TELEGRAM_URL = `http://localhost:${TELEGRAM_PORT}`;
export const BOT_TOKEN = 'e2e-token';
export const BOT_USERNAME = 'avtoskop_e2e_bot';
// 32 fixed bytes; test data only.
export const CONTACT_KEY = Buffer.alloc(32, 7).toString('base64');
export const ADMIN_TELEGRAM_ID = 9_000_001;
export const PHOTO_DIR = `${root}data/e2e-photos`;

// Settings for the site and the bot processes under test.
export function appEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: 'production',
    DATABASE_URL: TEST_DATABASE_URL,
    TELEGRAM_API_URL: TELEGRAM_URL,
    VIN_DECODER_URL: TELEGRAM_URL,
    TELEGRAM_BOT_TOKEN: BOT_TOKEN,
    TELEGRAM_BOT_USERNAME: BOT_USERNAME,
    REQUEST_CONTACT_KEY: CONTACT_KEY,
    SITE_URL: BASE_URL,
    ADMIN_TELEGRAM_IDS: String(ADMIN_TELEGRAM_ID),
    PHOTO_DIR,
    WANTED_IMPORT: 'off',
    FEEDBACK_TELEGRAM: 'avtoskop_feedback',
    SITE_OPERATOR: 'Test Operator',
    FOUNDER_NAME: 'Test Founder',
    CONTACT_EMAIL: 'test@example.com',
  };
}
