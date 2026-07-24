import { adminRouteError } from '../../../../lib/admin-api';
import { requireAdminApi } from '../../../../lib/admin-auth';
import { prisma } from '../../../../lib/prisma';
import { buildProductsCsv } from '../../../../lib/product-csv-export';

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    const products = await prisma.product.findMany({
      orderBy: [{ title: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        componentType: true,
        valueTier: true,
        retailer: true,
        affiliateUrl: true,
        imageUrl: true,
        defaultPriceText: true,
        enabled: true,
        assignments: {
          orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
          select: { badge: true },
        },
      },
    });
    const csv = buildProductsCsv(products);
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Disposition': `attachment; filename="affiliate-products-export-${date}.csv"`,
        'Content-Type': 'text/csv; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return adminRouteError(error);
  }
}
