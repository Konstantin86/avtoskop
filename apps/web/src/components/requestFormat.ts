import type { PublicRequest } from '@/server/requests';

export function yearsLabel(r: Pick<PublicRequest, 'yearFrom' | 'yearTo'>): string {
  return r.yearTo ? `${r.yearFrom}–${r.yearTo}` : `${r.yearFrom}+`;
}

export function formatNumber(locale: string, amount: number): string {
  return new Intl.NumberFormat(locale === 'uk' ? 'uk-UA' : 'en-US').format(amount);
}

export function timeAgo(locale: string, date: Date): string {
  const rtf = new Intl.RelativeTimeFormat(locale === 'uk' ? 'uk' : 'en', { numeric: 'auto' });
  const minutes = Math.round((date.getTime() - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  return rtf.format(Math.round(hours / 24), 'day');
}
