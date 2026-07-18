import type { Metadata } from 'next';

import { ProductCatalogDashboard } from '../../components/admin/ProductCatalogDashboard';
import { requireAdminPage } from '../../lib/admin-auth';
import { getCatalogProducts } from '../../lib/catalog-data';

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
  return (
    <ProductCatalogDashboard
      initialProducts={await getCatalogProducts()}
      openCreateForm={query.new === '1'}
    />
  );
}
