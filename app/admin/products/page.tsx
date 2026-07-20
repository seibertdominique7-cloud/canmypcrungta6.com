import type { Metadata } from 'next';

import { ProductCatalogDashboard } from '../../components/admin/ProductCatalogDashboard';
import { requireAdminPage } from '../../lib/admin-auth';
import { getCatalogProducts } from '../../lib/catalog-data';
import { getMediaAssets, getMediaFolders } from '../../lib/cms-data';

export const metadata: Metadata = {
  title: 'Product Catalog Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ProductCatalogAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string | string[] }>;
}) {
  await requireAdminPage();
  const query = await searchParams;
  const [products, media, mediaFolders] = await Promise.all([getCatalogProducts(), getMediaAssets(), getMediaFolders()]);
  return (
    <ProductCatalogDashboard
      initialMedia={media}
      initialMediaFolders={mediaFolders}
      initialProducts={products}
      openCreateForm={query.new === '1'}
    />
  );
}
