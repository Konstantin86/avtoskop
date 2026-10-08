import { describe, expect, it } from 'vitest';
import { buyerMessageDelay, isQuietHour, nextKyivHour } from './quiet.ts';

// Kyiv is UTC+3 in summer (October 8) and UTC+2 in winter (January 15).
describe('Kyiv quiet hours', () => {
  it('treats 22:00 to 8:00 Kyiv time as night', () => {
    expect(isQuietHour(new Date('2026-10-08T19:30:00Z'))).toBe(true); // 22:30 Kyiv
    expect(isQuietHour(new Date('2026-10-08T04:59:00Z'))).toBe(true); // 07:59 Kyiv
    expect(isQuietHour(new Date('2026-10-08T05:00:00Z'))).toBe(false); // 08:00 Kyiv
  });

  it('finds the next hour on the Kyiv clock, in summer and winter time', () => {
    expect(nextKyivHour(new Date('2026-10-08T19:30:00Z'), 8).toISOString()).toBe(
      '2026-10-09T05:00:00.000Z',
    );
    expect(nextKyivHour(new Date('2026-10-08T03:00:00Z'), 9).toISOString()).toBe(
      '2026-10-08T06:00:00.000Z',
    );
    expect(nextKyivHour(new Date('2027-01-15T20:00:00Z'), 8).toISOString()).toBe(
      '2027-01-16T06:00:00.000Z',
    );
  });

  it('crosses the switch to winter time correctly', () => {
    // Clocks go back on 25 October 2026; 8:00 Kyiv on the 25th is 06:00 UTC.
    expect(nextKyivHour(new Date('2026-10-24T20:00:00Z'), 8).toISOString()).toBe(
      '2026-10-25T06:00:00.000Z',
    );
  });
});

describe('buyerMessageDelay', () => {
  const night = new Date('2026-10-08T21:00:00Z'); // 00:00 Kyiv
  const day = new Date('2026-10-08T09:00:00Z'); // 12:00 Kyiv

  it('sends at once by day, holds night messages until 8:00, and digests until 9:00', () => {
    expect(buyerMessageDelay(day, { notifyMode: 'instant', quietHours: true })).toBeNull();
    expect(buyerMessageDelay(night, { notifyMode: 'instant', quietHours: false })).toBeNull();
    expect(
      buyerMessageDelay(night, { notifyMode: 'instant', quietHours: true })?.toISOString(),
    ).toBe('2026-10-09T05:00:00.000Z');
    expect(buyerMessageDelay(day, { notifyMode: 'digest', quietHours: false })?.toISOString()).toBe(
      '2026-10-09T06:00:00.000Z',
    );
  });
});
