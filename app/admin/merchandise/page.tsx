import type { Metadata } from 'next';

import { MerchandiseAdminDashboard } from '../../components/admin/MerchandiseAdminDashboard';
import { requireAdminPage } from '../../lib/admin-auth';
import { getMediaAssets, getMediaFolders } from '../../lib/cms-data';
import { getMerchandiseProducts } from '../../lib/merch-data';

export const metadata: Metadata = {
  title: 'Merchandise Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function MerchandiseAdminPage() {
  await requireAdminPage();
  const [products, media, mediaFolders] = await Promise.all([
    getMerchandiseProducts(),
    getMediaAssets(),
    getMediaFolders(),
  ]);
  return (
    <MerchandiseAdminDashboard
      initialMedia={media}
      initialMediaFolders={mediaFolders}
      initialProducts={products}
    />
  );
}
