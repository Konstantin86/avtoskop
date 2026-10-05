import { modelNames } from '@/server/models';

// Model names for one brand, used as suggestions in the request form.
export async function GET(request: Request) {
  const brandId = Number(new URL(request.url).searchParams.get('brandId'));
  if (!Number.isInteger(brandId) || brandId <= 0) return Response.json([], { status: 400 });
  return Response.json(await modelNames(brandId), {
    headers: { 'cache-control': 'public, max-age=3600' },
  });
}
