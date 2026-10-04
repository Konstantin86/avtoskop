import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const messages =
    locale === 'en'
      ? (await import('@avtoskop/i18n/messages/en.json')).default
      : (await import('@avtoskop/i18n/messages/uk.json')).default;
  return { locale, messages };
});
