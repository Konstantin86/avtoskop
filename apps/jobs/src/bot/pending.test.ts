import { describe, expect, it } from 'vitest';
import { packMessages } from './pending.ts';

describe('packMessages', () => {
  it('joins short messages under one header', () => {
    expect(packMessages(['one', 'two'], 'Header')).toEqual(['Header\n\none\n\n— — —\n\ntwo']);
  });

  it('starts a new part instead of going over the Telegram limit', () => {
    const long = 'x'.repeat(2500);
    const parts = packMessages([long, long], 'H');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toBe(`H\n\n${long}`);
    expect(parts[1]).toBe(long);
  });
});
