import { readPhotoFile } from '@/server/photos';

// Photo names are long random keys that appear only on private offer pages.
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const file = await readPhotoFile((await params).name);
  if (!file) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: {
      'content-type': 'image/webp',
      'cache-control': 'private, max-age=31536000, immutable',
      'x-robots-tag': 'noindex',
    },
  });
}
