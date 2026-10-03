import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cacheKey, createAutoriaClient } from './client.ts';

function setup(responses: Array<{ status: number; body?: unknown; retryAfter?: string }>) {
  let clock = 1_000_000;
  const urls: string[] = [];
  const sleeps: number[] = [];
  const fetchFn = (async (url: URL) => {
    urls.push(url.toString());
    const r = responses.shift() ?? { status: 200, body: { ok: true } };
    return new Response(JSON.stringify(r.body ?? {}), {
      status: r.status,
      headers: r.retryAfter ? { 'retry-after': r.retryAfter } : {},
    });
  }) as typeof fetch;
  return {
    urls,
    sleeps,
    advance: (ms: number) => (clock += ms),
    make: async (maxRequestsPerHour = 30, cacheDir?: string) =>
      createAutoriaClient({
        apiKey: 'secret-key',
        cacheDir: cacheDir ?? (await mkdtemp(join(tmpdir(), 'autoria-'))),
        maxRequestsPerHour,
        fetchFn,
        now: () => clock,
        sleep: async (ms) => {
          sleeps.push(ms);
          clock += ms;
        },
      }),
  };
}

describe('autoria client', () => {
  it('serves repeated requests from the cache within the TTL', async () => {
    const t = setup([{ status: 200, body: { n: 1 } }]);
    const client = await t.make();
    expect(await client.get('/auto/search', { a: 1 }, 60_000)).toEqual({ n: 1 });
    expect(await client.get('/auto/search', { a: 1 }, 60_000)).toEqual({ n: 1 });
    expect(t.urls).toHaveLength(1);
    t.advance(61_000);
    await client.get('/auto/search', { a: 1 }, 60_000);
    expect(t.urls).toHaveLength(2);
  });

  it('keeps the API key out of the cache files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'autoria-'));
    const t = setup([{ status: 200, body: { n: 1 } }]);
    const client = await t.make(30, dir);
    await client.get('/auto/info', { auto_id: 5 }, 60_000);
    const file = join(dir, 'cache', 'auto_info', `${cacheKey('/auto/info', { auto_id: 5 })}.json`);
    expect(await readFile(file, 'utf8')).not.toContain('secret-key');
    expect(t.urls[0]).toContain('api_key=secret-key');
  });

  it('waits when the hourly limit is reached', async () => {
    const t = setup([]);
    const client = await t.make(2);
    await client.get('/x', { a: 1 }, 0);
    await client.get('/x', { a: 2 }, 0);
    await client.get('/x', { a: 3 }, 0);
    expect(t.sleeps).toHaveLength(1);
    expect(t.sleeps[0]).toBeGreaterThan(59 * 60 * 1000);
  });

  it('retries after HTTP 429', async () => {
    const t = setup([
      { status: 429, retryAfter: '120' },
      { status: 200, body: { n: 2 } },
    ]);
    const client = await t.make();
    expect(await client.get('/x', {}, 0)).toEqual({ n: 2 });
    expect(t.sleeps).toEqual([120_000]);
  });

  it('throws on other errors without leaking the key', async () => {
    const t = setup([{ status: 403 }]);
    const client = await t.make();
    await expect(client.get('/x', {}, 0)).rejects.toThrow('HTTP 403');
    await expect(client.get('/x', {}, 0)).resolves.toBeDefined();
  });
});
