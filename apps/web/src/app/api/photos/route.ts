import { getCurrentUser } from '@/server/auth';
import { photoUrl, uploadPhoto } from '@/server/photos';

// One photo per request, so the offer form can show progress and the 1 MB limit
// on form submissions doesn't apply.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  const seller = user?.seller;
  if (!seller || seller.status === 'banned')
    return Response.json({ error: 'auth' }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get('photo');
  if (!(file instanceof Blob)) return Response.json({ error: 'notImage' }, { status: 400 });
  const result = await uploadPhoto(seller.id, file);
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json({ id: result.id, thumb: photoUrl(result.key, 'thumb') });
}
