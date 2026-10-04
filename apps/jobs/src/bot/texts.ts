import en from '@avtoskop/i18n/messages/en.json' with { type: 'json' };
import uk from '@avtoskop/i18n/messages/uk.json' with { type: 'json' };

export type BotTextKey = keyof typeof uk.bot;

// Bot messages are plain text with {name} placeholders, not ICU like the website.
export function botText(locale: string, key: BotTextKey, vars: Record<string, string> = {}) {
  const messages = locale === 'en' ? en.bot : uk.bot;
  return messages[key].replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? '');
}

export function requestLabel(r: {
  brand: string;
  model: string;
  yearFrom: number;
  yearTo: number | null;
}) {
  return `${r.brand} ${r.model} ${r.yearTo ? `${r.yearFrom}–${r.yearTo}` : `${r.yearFrom}+`}`;
}
