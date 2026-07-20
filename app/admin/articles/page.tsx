import type { Metadata } from 'next';
import { ContentAdminDashboard } from '../../components/admin/ContentAdminDashboard';
import { requireAdminPage } from '../../lib/admin-auth';
import { getContentWorkspace } from '../../lib/cms-data';
export const metadata: Metadata = { title: 'Articles Admin', robots: { index: false, follow: false } }; export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ new?: string }> }) { await requireAdminPage(); return <ContentAdminDashboard kind="article" initialWorkspace={await getContentWorkspace()} openCreateForm={(await searchParams).new === '1'} />; }
