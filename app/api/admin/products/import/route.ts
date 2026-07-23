import { requireAdminApi } from '../../../../lib/admin-auth';
import { readJson } from '../../../../lib/admin-api';
import {
  AUTO_IMPORT_FALLBACK_MESSAGE,
  importProductMetadata,
  ProductMetadataImportError,
} from '../../../../lib/product-metadata-import';

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const body = await readJson(request);
  const url = typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>).url === 'string'
    ? (body as Record<string, string>).url
    : '';

  try {
    return Response.json({ data: await importProductMetadata(url) });
  } catch (error) {
    if (error instanceof ProductMetadataImportError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[admin/catalog-import] Product metadata import failed.', {
      error: error instanceof Error ? error.name : 'UnknownError',
    });
    return Response.json({ error: AUTO_IMPORT_FALLBACK_MESSAGE }, { status: 500 });
  }
}
