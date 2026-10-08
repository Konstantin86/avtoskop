import type { PublicRequest } from '@/server/requests';

export function yearsLabel(r: Pick<PublicRequest, 'yearFrom' | 'yearTo'>): string {
  return r.yearTo ? `${r.yearFrom}–${r.yearTo}` : `${r.yearFrom}+`;
}

// Accepted fuels as one phrase, or null when any fuel is fine.
export function fuelsLabel(
  fuels: readonly string[],
  label: (fuel: string) => string,
): string | null {
  return fuels.length > 0 ? fuels.map(label).join(', ') : null;
}

export function formatNumber(locale: string, amount: number): string {
  return new Intl.NumberFormat(locale === 'uk' ? 'uk-UA' : 'en-US').format(amount);
}

// "$22 000" or, for an order quoted as a range, "$22 000–25 000".
export function priceLabel(locale: string, priceUsd: number, priceMaxUsd?: number | null): string {
  const from = formatNumber(locale, priceUsd);
  return priceMaxUsd && priceMaxUsd > priceUsd
    ? `$${from}–${formatNumber(locale, priceMaxUsd)}`
    : `$${from}`;
}

export function timeAgo(locale: string, date: Date): string {
  const rtf = new Intl.RelativeTimeFormat(locale === 'uk' ? 'uk' : 'en', { numeric: 'auto' });
  const minutes = Math.round((date.getTime() - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  return rtf.format(Math.round(hours / 24), 'day');
}
