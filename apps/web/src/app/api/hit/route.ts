import { sql } from 'drizzle-orm';
import { pageKind } from '@avtoskop/core';
import { pageViews } from '@avtoskop/db';
import { db } from '@/server/db';

const KNOWN: Array<[RegExp, string]> = [
  [/(^|\.)(t\.me|telegram\.(org|me))$/, 'telegram'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)threads\.(net|com)$/, 'threads'],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, 'x'],
  [/(^|\.)(facebook\.com|fb\.com)$/, 'facebook'],
  [/(^|\.)google\.[a-z.]+$/, 'google'],
];

function source(ref: unknown, utm: unknown): string {
  if (typeof utm === 'string' && /^[a-z0-9_-]{1,30}$/i.test(utm)) return utm.toLowerCase();
  if (typeof ref !== 'string' || !ref) return 'direct';
  const host = ref
    .toLowerCase()
    .replace(/^www\./, '')
    .slice(0, 60);
  const known = KNOWN.find(([re]) => re.test(host));
  return known ? known[1] : /^[a-z0-9.-]+$/.test(host) ? host : 'other';
}

// Adds one anonymous page view to today's count; nothing that identifies a person is kept.
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 400 });
  }
  const page = typeof body['path'] === 'string' ? pageKind(body['path']) : null;
  if (!page) return new Response(null, { status: 400 });
  await db
    .insert(pageViews)
    .values({
      day: new Date().toISOString().slice(0, 10),
      page,
      source: source(body['ref'], body['utm']),
      views: 1,
    })
    .onConflictDoUpdate({
      target: [pageViews.day, pageViews.page, pageViews.source],
      set: { views: sql`${pageViews.views} + 1` },
    });
  return new Response(null, { status: 204 });
}
