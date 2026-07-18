import { readJson } from '../../../../lib/admin-api';
import { requireAdminApi } from '../../../../lib/admin-auth';
import {
  deleteSubscriber,
  setSubscriberStatus,
  SubscriberDataError,
} from '../../../../lib/subscriber-data';

export async function PATCH(request: Request, context: RouteContext<'/api/admin/subscribers/[id]'>) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = await readJson(request);
  const action = readStatusAction(body);

  if (!action) {
    return Response.json({ error: 'Choose unsubscribe or reactivate.' }, { status: 400 });
  }

  try {
    await setSubscriberStatus(id, action === 'reactivate' ? 'active' : 'unsubscribed');
    return Response.json({ ok: true });
  } catch (error) {
    return subscriberAdminMutationError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<'/api/admin/subscribers/[id]'>) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    await deleteSubscriber(id);
    return Response.json({ ok: true });
  } catch (error) {
    return subscriberAdminMutationError(error);
  }
}

function readStatusAction(value: unknown) {
  if (typeof value !== 'object' || value === null || !('action' in value)) return null;
  const action = value.action;
  return action === 'unsubscribe' || action === 'reactivate' ? action : null;
}

function subscriberAdminMutationError(error: unknown) {
  if (error instanceof SubscriberDataError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error(
    '[subscriber admin] Mutation failed.',
    error instanceof Error ? error.name : 'UnknownError',
  );
  return Response.json(
    { error: 'The subscriber change could not be completed.' },
    { status: 500 },
  );
}
