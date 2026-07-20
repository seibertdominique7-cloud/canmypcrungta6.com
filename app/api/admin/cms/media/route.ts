import { requireAdminApi } from '../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../lib/admin-api';
import { createExternalMediaAsset, createMediaAsset, getMediaAssets, getMediaFolders } from '../../../../lib/cms-data';
import { getMediaStorage, getMediaStorageStatus } from '../../../../lib/media-storage';

export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  const [items, folders] = await Promise.all([getMediaAssets(), getMediaFolders()]);
  return Response.json({ items, folders, storageStatus: getMediaStorageStatus() });
}

export async function POST(request: Request) {
  const denied = await requireAdminApi(request); if (denied) return denied;
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await readJson(request); const item = record(body);
      await createExternalMediaAsset({ url: stringValue(item.url, 2048), altText: stringValue(item.altText, 300), title: stringValue(item.title, 180), folderId: optionalString(item.folderId) });
      return response('External image added.', 201);
    }
    const formData = await request.formData(); const file = formData.get('file');
    if (!(file instanceof File)) return Response.json({ error: 'Choose an image to upload.' }, { status: 400 });
    const storage = getMediaStorage(); const stored = await storage.save(file);
    try { await createMediaAsset({ ...stored, altText: formValue(formData.get('altText'), 300), title: formValue(formData.get('title'), 180) || stored.filename, folderId: formValue(formData.get('folderId'), 100) || null }); }
    catch (error) { await storage.delete(stored.storageKey, stored.url); throw error; }
    return response('Image uploaded.', 201);
  } catch (error) { return adminRouteError(error); }
}

async function response(message: string, status: number) { const [items, folders] = await Promise.all([getMediaAssets(), getMediaFolders()]); return Response.json({ message, items, folders, storageStatus: getMediaStorageStatus() }, { status }); }
function record(value: unknown) { return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}; }
function stringValue(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function optionalString(value: unknown) { const result = stringValue(value, 100); return result || null; }
function formValue(value: FormDataEntryValue | null, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
