import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['uk', 'en'],
  defaultLocale: 'uk',
  // Addresses show /ua instead of the language code /uk (see packages/core/src/locale.ts).
  localePrefix: { mode: 'always', prefixes: { uk: '/ua', en: '/en' } },
});

export type Locale = (typeof routing.locales)[number];
