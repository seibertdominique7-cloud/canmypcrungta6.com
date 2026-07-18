import type { Metadata } from 'next';

import { RecommendationAdminDashboard } from '../../components/admin/RecommendationAdminDashboard';
import { requireAdminPage } from '../../lib/admin-auth';
import { getRecommendationWorkspace } from '../../lib/catalog-data';

export const metadata: Metadata = {
  title: 'Recommendations Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function RecommendationsAdminPage() {
  await requireAdminPage();
  return <RecommendationAdminDashboard initialWorkspace={await getRecommendationWorkspace()} />;
}
