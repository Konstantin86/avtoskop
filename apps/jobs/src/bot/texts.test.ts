import { describe, expect, it } from 'vitest';
import en from '@avtoskop/i18n/messages/en.json' with { type: 'json' };
import uk from '@avtoskop/i18n/messages/uk.json' with { type: 'json' };
import { botText, requestLabel } from './texts.ts';

describe('botText', () => {
  it('fills placeholders and falls back to Ukrainian', () => {
    expect(botText('uk', 'requestLink', { link: 'https://x/y' })).toContain('https://x/y');
    expect(botText('de', 'sharePhone')).toBe(uk.bot.sharePhone);
    expect(botText('en', 'sharePhone')).toBe(en.bot.sharePhone);
  });

  it('has the same keys in both languages', () => {
    expect(Object.keys(en.bot).sort()).toEqual(Object.keys(uk.bot).sort());
  });
});

describe('requestLabel', () => {
  it('shows open and closed year ranges', () => {
    expect(requestLabel({ brand: 'Toyota', model: 'RAV4', yearFrom: 2019, yearTo: null })).toBe(
      'Toyota RAV4 2019+',
    );
    expect(requestLabel({ brand: 'Mazda', model: 'CX-5', yearFrom: 2018, yearTo: 2021 })).toBe(
      'Mazda CX-5 2018–2021',
    );
  });
});
