import type { Metadata } from 'next';

import { AiSeoPublisherDashboard } from '../../components/admin/AiSeoPublisherDashboard';
import { requireAdminPage } from '../../lib/admin-auth';
import { getAiSeoWorkspace } from '../../lib/ai-seo-service';

export const metadata: Metadata = {
  title: 'AI SEO Publisher Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AiSeoPublisherPage() {
  await requireAdminPage();
  return <AiSeoPublisherDashboard initialWorkspace={await getAiSeoWorkspace()} />;
}
