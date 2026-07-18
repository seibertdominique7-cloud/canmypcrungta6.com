import type { Metadata } from 'next';

import { SubscriberAdminDashboard } from '../../components/admin/SubscriberAdminDashboard';
import { requireAdminPage } from '../../lib/admin-auth';
import { getSubscriberAdminPayload } from '../../lib/subscriber-data';
import { parseSubscriberAdminFilters } from '../../lib/subscriber-validation';

export const metadata: Metadata = {
  title: 'Email Subscriber Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function SubscriberAdminPage() {
  await requireAdminPage();
  const filters = parseSubscriberAdminFilters(new URLSearchParams());
  const initialPayload = await getSubscriberAdminPayload(filters);

  return <SubscriberAdminDashboard initialPayload={initialPayload} />;
}
