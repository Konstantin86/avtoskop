import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type Params = Record<string, string | number>;

export interface RequestEvent {
  endpoint: string;
  params: Params;
  status: number | null;
  fromCache: boolean;
}

export interface AutoriaClientOptions {
  apiKey: string;
  cacheDir: string;
  maxRequestsPerHour: number;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  onRequest?: (event: RequestEvent) => void | Promise<void>;
  log?: (message: string) => void;
}

interface CacheEntry {
  fetchedAt: number;
  endpoint: string;
  params: Params;
  body: unknown;
}

const HOUR = 60 * 60 * 1000;
const MAX_RETRIES = 3;

export class AutoriaHttpError extends Error {
  readonly status: number;
  constructor(status: number, endpoint: string) {
    super(`auto.ria ${endpoint} failed with HTTP ${status}`);
    this.status = status;
  }
}

export function cacheKey(endpoint: string, params: Params): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => [k, String(params[k])]);
  return createHash('sha256')
    .update(endpoint + JSON.stringify(sorted))
    .digest('hex');
}

// Caches every response on disk and keeps under the hourly request limit, counting
// requests in a log file so the limit holds across restarts.
export function createAutoriaClient(options: AutoriaClientOptions) {
  const baseUrl = options.baseUrl ?? 'https://developers.ria.com';
  const fetchFn = options.fetchFn ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const log = options.log ?? (() => {});
  const requestLog = join(options.cacheDir, 'requests.jsonl');
  let recent: number[] | null = null;

  async function loadRecent(): Promise<number[]> {
    if (recent) return recent;
    try {
      const lines = (await readFile(requestLog, 'utf8')).split('\n').filter(Boolean);
      recent = lines.map((l) => (JSON.parse(l) as { t: number }).t);
    } catch {
      recent = [];
    }
    return recent;
  }

  async function waitForSlot(): Promise<void> {
    const times = await loadRecent();
    for (;;) {
      const cutoff = now() - HOUR;
      while (times.length > 0 && times[0]! <= cutoff) times.shift();
      if (times.length < options.maxRequestsPerHour) return;
      const waitMs = times[0]! + HOUR - now() + 1000;
      log(`Hourly limit reached, waiting ${Math.ceil(waitMs / 60000)} min`);
      await sleep(waitMs);
    }
  }

  async function recordRequest(endpoint: string): Promise<void> {
    const t = now();
    (await loadRecent()).push(t);
    await mkdir(options.cacheDir, { recursive: true });
    await appendFile(requestLog, JSON.stringify({ t, endpoint }) + '\n');
  }

  async function get<T = unknown>(endpoint: string, params: Params, ttlMs: number): Promise<T> {
    const file = join(
      options.cacheDir,
      'cache',
      endpoint.replace(/^\//, '').replace(/\//g, '_'),
      `${cacheKey(endpoint, params)}.json`,
    );
    try {
      const entry = JSON.parse(await readFile(file, 'utf8')) as CacheEntry;
      if (now() - entry.fetchedAt < ttlMs) {
        await options.onRequest?.({ endpoint, params, status: null, fromCache: true });
        return entry.body as T;
      }
    } catch {
      // No usable cache entry.
    }

    for (let attempt = 0; ; attempt++) {
      await waitForSlot();
      const url = new URL(endpoint, baseUrl);
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
      url.searchParams.set('api_key', options.apiKey);

      const res = await fetchFn(url);
      await recordRequest(endpoint);
      await options.onRequest?.({ endpoint, params, status: res.status, fromCache: false });

      if (res.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = Number(res.headers.get('retry-after'));
        const waitMs =
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 15 * 60 * 1000;
        log(`HTTP 429 from auto.ria, retrying in ${Math.ceil(waitMs / 60000)} min`);
        await sleep(waitMs);
        continue;
      }
      if (!res.ok) throw new AutoriaHttpError(res.status, endpoint);

      const body = (await res.json()) as T;
      const entry: CacheEntry = { fetchedAt: now(), endpoint, params, body };
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(entry));
      return body;
    }
  }

  async function requestsSince(sinceMs: number): Promise<number> {
    return (await loadRecent()).filter((t) => t >= sinceMs).length;
  }

  return { get, requestsSince };
}

export type AutoriaClient = ReturnType<typeof createAutoriaClient>;
