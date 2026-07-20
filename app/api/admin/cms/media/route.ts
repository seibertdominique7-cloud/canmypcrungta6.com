import { requireAdminApi } from '../../../../lib/admin-auth';
import { adminRouteError } from '../../../../lib/admin-api';
import { createMediaAsset, getMediaAssets } from '../../../../lib/cms-data';
import { getMediaStorage } from '../../../../lib/media-storage';

export async function GET(request: Request) { const denied = await requireAdminApi(request); return denied ?? Response.json({ items: await getMediaAssets() }); }
export async function POST(request: Request) {
  const denied = await requireAdminApi(request); if (denied) return denied;
  try {
    const formData = await request.formData(); const file = formData.get('file');
    if (!(file instanceof File)) return Response.json({ error: 'Choose an image to upload.' }, { status: 400 });
    const stored = await getMediaStorage().save(file);
    try { await createMediaAsset({ ...stored, altText: stringValue(formData.get('altText')), title: stringValue(formData.get('title')) || stored.filename }); }
    catch (error) { await getMediaStorage().delete(stored.storageKey); throw error; }
    return Response.json({ message: 'Image uploaded.', items: await getMediaAssets() }, { status: 201 });
  } catch (error) { return adminRouteError(error); }
}
function stringValue(value: FormDataEntryValue | null) { return typeof value === 'string' ? value.trim().slice(0, 300) : ''; }
