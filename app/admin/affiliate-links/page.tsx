import type { Metadata } from 'next';

import { AffiliateAdminDashboard } from '../../components/admin/AffiliateAdminDashboard';
import { requireAdminPage } from '../../lib/admin-auth';
import { getAdminScenarios } from '../../lib/affiliate-data';

export const metadata: Metadata = {
  title: 'Affiliate Link Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AffiliateAdminPage() {
  await requireAdminPage();
  const scenarios = await getAdminScenarios();

  return <AffiliateAdminDashboard initialScenarios={scenarios} />;
}
