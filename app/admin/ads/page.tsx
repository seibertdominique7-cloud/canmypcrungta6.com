import type { Metadata } from 'next';

import { AdsAdminDashboard } from '../../components/admin/AdsAdminDashboard';
import { getAdminAdWorkspace } from '../../lib/ad-data';
import { requireAdminPage } from '../../lib/admin-auth';

export const metadata: Metadata = {
  title: 'Ads Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdsAdminPage() {
  await requireAdminPage();
  return <AdsAdminDashboard initialWorkspace={await getAdminAdWorkspace()} />;
}
