import { z } from 'zod';
import { MIN_SELLERS_TO_SHOW, REGION_CODES, SELLER_TYPES } from '@avtoskop/core';
import { countReachableSellers } from '@/server/reach';

const Query = z.object({
  brandId: z.coerce.number().int().positive(),
  region: z.enum(REGION_CODES),
  importOk: z.enum(['true', 'false']).transform((v) => v === 'true'),
  sellerTypes: z
    .string()
    .transform((v) => (v ? v.split(',') : []))
    .pipe(z.array(z.enum(SELLER_TYPES))),
});

// Number of sellers a request would reach, shown on the request form. Small numbers stay hidden.
export async function GET(request: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ count: 0 }, { status: 400 });
  const count = await countReachableSellers(parsed.data);
  return Response.json(
    { count: count >= MIN_SELLERS_TO_SHOW ? count : 0 },
    { headers: { 'cache-control': 'public, max-age=300' } },
  );
}
