// The language code stays `uk` (ISO 639-1, used for formatting), but addresses show `/ua`,
// which Ukrainians expect; `/uk` reads as the United Kingdom.
export const LOCALE_URL_PREFIX: Record<string, string> = { uk: 'ua', en: 'en' };

export function localePath(locale: string, path: string): string {
  return `/${LOCALE_URL_PREFIX[locale] ?? 'ua'}${path}`;
}
