import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Secrets live in the repository root .env, shared with the jobs app.
try {
  process.loadEnvFile('../../.env');
} catch {
  // No .env file, e.g. on the server where Coolify sets the variables.
}

const config: NextConfig = {
  transpilePackages: ['@avtoskop/core', '@avtoskop/db', '@avtoskop/i18n'],
  // Type checking runs separately with `pnpm typecheck` (TypeScript 7).
  typescript: { ignoreBuildErrors: true },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(config);
