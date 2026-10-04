import { describe, expect, it } from 'vitest';
import { redactContacts } from './redact.ts';

describe('redactContacts', () => {
  it.each([
    ['Дзвоніть 050 123 45 67 після 18:00', 'Дзвоніть ••• після 18:00'],
    ['+380(50)123-45-67', '•••'],
    ['пишіть на ivan.petrenko@gmail.com', 'пишіть на •••'],
    ['telegram @ivan_cars', 'telegram •••'],
    ['див. https://auto.ria.com/uk/auto_123.html', 'див. •••'],
    ['мій сайт ivan-cars.com.ua', 'мій сайт •••'],
  ])('%s', (input, expected) => {
    expect(redactContacts(input)).toBe(expected);
  });

  it('keeps ordinary car wishes intact', () => {
    const text = 'Біла, 2.5 гібрид, пробіг до 100 000 км, 2019-2021, без ДТП';
    expect(redactContacts(text)).toBe(text);
  });
});
