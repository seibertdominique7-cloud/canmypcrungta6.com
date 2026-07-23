import type { Metadata } from 'next';

import { ContactAdminDashboard } from '../../components/admin/ContactAdminDashboard';
import { requireAdminPage } from '../../lib/admin-auth';
import { getContactSubmissions } from '../../lib/contact-data';

export const metadata: Metadata = { title: 'Contact Messages Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Page() {
  await requireAdminPage();
  return <ContactAdminDashboard initialSubmissions={await getContactSubmissions()} />;
}
