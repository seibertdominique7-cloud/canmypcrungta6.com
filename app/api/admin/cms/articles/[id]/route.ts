import { requireAdminApi } from '../../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../../lib/admin-api';
import { deleteArticle, duplicateArticle, getContentWorkspace, restoreRevision, updateArticle } from '../../../../../lib/cms-data';
import { validateArticleInput } from '../../../../../lib/cms-validation';
import { sanitizeRichTextBody } from '../../../../../lib/rich-text';

export async function PATCH(request: Request, context: RouteContext<'/api/admin/cms/articles/[id]'>) {
  const denied = await requireAdminApi(request); if (denied) return denied;
  const { id } = await context.params; const body = await readJson(request); const record = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
  try {
    if (record.action === 'duplicate') { await duplicateArticle(id); return Response.json({ message: 'Draft copy created.', workspace: await getContentWorkspace() }); }
    if (record.action === 'restore' && typeof record.revisionId === 'string') { await restoreRevision('article', id, record.revisionId); return Response.json({ message: 'Revision restored.', workspace: await getContentWorkspace() }); }
    const validation = validateArticleInput(body);
    if (!validation.data) return Response.json({ error: 'Correct the highlighted article fields.', fieldErrors: validation.fieldErrors }, { status: 400 });
    await updateArticle(id, { ...validation.data, body: sanitizeRichTextBody(validation.data.body) }); return Response.json({ message: 'Article saved.', warnings: validation.warnings, workspace: await getContentWorkspace() });
  } catch (error) { return adminRouteError(error); }
}
export async function DELETE(request: Request, context: RouteContext<'/api/admin/cms/articles/[id]'>) { const denied = await requireAdminApi(request); if (denied) return denied; try { await deleteArticle((await context.params).id); return Response.json({ message: 'Article deleted.', workspace: await getContentWorkspace() }); } catch (error) { return adminRouteError(error); } }
