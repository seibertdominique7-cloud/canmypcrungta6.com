import type { Metadata } from 'next';

import { CreatorRecommendationAdminDashboard } from '../../components/admin/CreatorRecommendationAdminDashboard';
import { requireAdminPage } from '../../lib/admin-auth';
import { getCreatorRecommendationWorkspace } from '../../lib/creator-recommendation-data';

export const metadata: Metadata = {
  title: 'Creator Recommendations Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CreatorRecommendationsAdminPage() {
  await requireAdminPage();
  return (
    <CreatorRecommendationAdminDashboard
      initialWorkspace={await getCreatorRecommendationWorkspace()}
    />
  );
}
