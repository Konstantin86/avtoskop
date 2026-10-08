// Buyer message timing in Kyiv time: quiet nights and a once-a-day morning summary.
export const QUIET_FROM_HOUR = 22;
export const QUIET_TO_HOUR = 8;
export const DIGEST_HOUR = 9;
const ZONE = 'Europe/Kyiv';

function kyivParts(at: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  // "GMT+03:00" → +180 minutes; "GMT" alone means UTC.
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(get('timeZoneName'));
  const offset = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    offset,
  };
}

export function isQuietHour(at: Date): boolean {
  const { hour } = kyivParts(at);
  return hour >= QUIET_FROM_HOUR || hour < QUIET_TO_HOUR;
}

// The next moment the Kyiv clock shows `hour`:00, strictly after `at`.
export function nextKyivHour(at: Date, hour: number): Date {
  const { year, month, day, offset } = kyivParts(at);
  for (let add = 0; add < 3; add++) {
    const guess = new Date(Date.UTC(year, month - 1, day + add, hour) - offset * 60_000);
    // Re-read the offset on that day, in case summer time changed in between.
    const fixed = new Date(guess.getTime() - (kyivParts(guess).offset - offset) * 60_000);
    if (fixed > at) return fixed;
  }
  return new Date(at.getTime() + 24 * 3_600_000);
}

// When a buyer message should go out, or null to send it now.
export function buyerMessageDelay(
  at: Date,
  settings: { notifyMode: string; quietHours: boolean },
): Date | null {
  if (settings.notifyMode === 'digest') return nextKyivHour(at, DIGEST_HOUR);
  if (settings.quietHours && isQuietHour(at)) return nextKyivHour(at, QUIET_TO_HOUR);
  return null;
}
