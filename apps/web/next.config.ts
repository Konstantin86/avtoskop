import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Secrets live in the repository root .env, shared with the jobs app.
try {
  process.loadEnvFile('../../.env');
} catch {
  // No .env file, e.g. on the server where Coolify sets the variables.
}

// Lets other devices on the network open the dev server at SITE_URL (e.g. a phone on Wi-Fi).
const siteHost = process.env['SITE_URL'] ? new URL(process.env['SITE_URL']).hostname : null;

const config: NextConfig = {
  ...(siteHost && siteHost !== 'localhost' && { allowedDevOrigins: [siteHost] }),
  // Old /uk addresses (including links already sent by the bot) move to /ua.
  async redirects() {
    return [
      { source: '/uk', destination: '/ua', permanent: true },
      { source: '/uk/:path*', destination: '/ua/:path*', permanent: true },
    ];
  },
  transpilePackages: ['@avtoskop/core', '@avtoskop/db', '@avtoskop/i18n'],
  // Type checking runs separately with `pnpm typecheck` (TypeScript 7).
  typescript: { ignoreBuildErrors: true },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(config);
