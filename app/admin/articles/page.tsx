import type { Metadata } from 'next';
import { ContentAdminDashboard } from '../../components/admin/ContentAdminDashboard';
import { requireAdminPage } from '../../lib/admin-auth';
import { getContentWorkspace } from '../../lib/cms-data';
export const metadata: Metadata = { title: 'Articles Admin', robots: { index: false, follow: false } }; export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) { await requireAdminPage(); const query = await searchParams; return <ContentAdminDashboard initialEditId={query.edit} kind="article" initialWorkspace={await getContentWorkspace()} openCreateForm={query.new === '1'} />; }
