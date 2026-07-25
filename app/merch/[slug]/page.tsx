import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { FourthwallProductDetails } from '../../components/fourthwall/FourthwallProductDetails';
import {
  FourthwallApiError,
  getFourthwallProduct,
} from '../../lib/fourthwall';
import {
  formatFourthwallMoney,
  getFourthwallImageUrl,
  getFourthwallStartingPrice,
} from '../../lib/fourthwall-types';
import { getSiteUrl } from '../../lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getFourthwallProduct(slug);
    if (!product) return unavailableMetadata();
    const description =
      product.description?.trim() ||
      `Shop ${product.name}, fulfilled securely by Fourthwall.`;
    const image = getFourthwallImageUrl(product.images[0]);
    return {
      title: `${product.name} | Launch Day Gear`,
      description,
      alternates: { canonical: `/merch/${product.slug}` },
      openGraph: {
        title: product.name,
        description,
        type: 'website',
        url: `/merch/${product.slug}`,
        images: image ? [image] : undefined,
      },
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        title: product.name,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch (error) {
    if (error instanceof FourthwallApiError && error.status === 404) {
      return unavailableMetadata();
    }
    throw error;
  }
}

export default async function MerchProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let product;
  try {
    product = await getFourthwallProduct(slug);
  } catch (error) {
    if (error instanceof FourthwallApiError && error.status === 404) notFound();
    throw error;
  }
  if (!product) notFound();

  const startingPrice = getFourthwallStartingPrice(product);
  const image = getFourthwallImageUrl(product.images[0]);
  const productUrl = `${getSiteUrl()}/merch/${product.slug}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: image ? [image] : undefined,
    url: productUrl,
    offers: startingPrice
      ? {
          '@type': 'AggregateOffer',
          lowPrice: Number(startingPrice.value),
          priceCurrency: startingPrice.currency,
          offerCount: product.variants.length,
          availability: 'https://schema.org/InStock',
          url: productUrl,
        }
      : undefined,
  };

  return (
    <main className="public-theme min-h-screen px-4 py-8 text-slate-100 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          className="theme-link inline-flex items-center gap-2 text-sm font-bold"
          href="/merch"
        >
          <span aria-hidden="true">←</span> Back to Launch Day Gear
        </Link>
        <div className="mt-6">
          <FourthwallProductDetails product={product} />
        </div>
        {startingPrice ? (
          <p className="sr-only">
            Starting at {formatFourthwallMoney(startingPrice)}
          </p>
        ) : null}
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
          type="application/ld+json"
        />
      </div>
    </main>
  );
}

function unavailableMetadata(): Metadata {
  return {
    title: 'Product unavailable | Launch Day Gear',
    robots: { index: false, follow: false },
  };
}
