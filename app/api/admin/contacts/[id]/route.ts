import { requireAdminApi } from '../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../lib/admin-api';
import { deleteContactSubmission, getContactSubmissions, updateContactSubmissionStatus } from '../../../../lib/contact-data';

export async function PATCH(request: Request, context: RouteContext<'/api/admin/contacts/[id]'>) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  const body = await readJson(request);
  const status = typeof body === 'object' && body !== null && typeof (body as { status?: unknown }).status === 'string' ? (body as { status: string }).status : '';
  try {
    await updateContactSubmissionStatus((await context.params).id, status);
    return Response.json({ message: 'Contact status updated.', submissions: await getContactSubmissions() });
  } catch (error) {
    return adminRouteError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<'/api/admin/contacts/[id]'>) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  try {
    await deleteContactSubmission((await context.params).id);
    return Response.json({ message: 'Contact message deleted.', submissions: await getContactSubmissions() });
  } catch (error) {
    return adminRouteError(error);
  }
}
