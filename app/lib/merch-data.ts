import 'server-only';

import type { MerchandiseProduct } from '../../generated/prisma/client';
import { AdminDataError } from './admin-data-error';
import { prisma } from './prisma';
import {
  DEFAULT_MERCH_STORE_SETTINGS,
  type MerchandiseProductInput,
  type MerchandiseProductRecord,
  type MerchStoreSettings,
} from './merch-types';
import {
  isPublicMerchandiseProduct,
  isPublicMerchStore,
} from './merch-validation';

const MERCH_SETTINGS = {
  storeEnabled: setting('merch_store_enabled', 'Store enabled', 'boolean'),
  storeUrl: setting('merch_store_url', 'Fourthwall store URL', 'url'),
  storeSubdomain: setting('merch_store_subdomain', 'Store subdomain', 'text'),
  storeOpenGraphImage: setting(
    'merch_store_open_graph_image',
    'Store social preview image',
    'image',
  ),
  navigationLabel: setting('merch_navigation_label', 'Store navigation label', 'text'),
  homepageSectionEnabled: setting(
    'merch_homepage_enabled',
    'Homepage merchandise section enabled',
    'boolean',
  ),
  homepageTitle: setting('merch_homepage_title', 'Homepage merchandise title', 'text'),
  homepageDescription: setting(
    'merch_homepage_description',
    'Homepage merchandise description',
    'textarea',
  ),
  homepageCtaLabel: setting('merch_homepage_cta_label', 'Homepage CTA label', 'text'),
  homepageCtaUrl: setting('merch_homepage_cta_url', 'Homepage CTA URL', 'url'),
  openLinksInNewTab: setting(
    'merch_links_new_tab',
    'Open merchandise links in a new tab',
    'boolean',
  ),
  showInArticles: setting(
    'merch_articles_enabled',
    'Article merchandise blocks enabled',
    'boolean',
  ),
  announcementEnabled: setting(
    'merch_announcement_enabled',
    'Store announcement enabled',
    'boolean',
  ),
  announcementText: setting(
    'merch_announcement_text',
    'Store announcement text',
    'textarea',
  ),
  disclaimerText: setting(
    'merch_disclaimer_text',
    'Fourthwall disclaimer',
    'textarea',
  ),
} as const;

export async function getMerchStoreSettings(): Promise<MerchStoreSettings> {
  const rows = await prisma.siteContent.findMany({
    where: { key: { in: Object.values(MERCH_SETTINGS).map((item) => item.key) } },
    select: { key: true, value: true },
  });
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const value = <Key extends keyof MerchStoreSettings>(key: Key) =>
    values.get(MERCH_SETTINGS[key].key);

  return {
    storeEnabled: readBoolean(value('storeEnabled'), DEFAULT_MERCH_STORE_SETTINGS.storeEnabled),
    storeUrl: value('storeUrl') ?? DEFAULT_MERCH_STORE_SETTINGS.storeUrl,
    storeSubdomain:
      value('storeSubdomain') ?? DEFAULT_MERCH_STORE_SETTINGS.storeSubdomain,
    storeOpenGraphImage:
      value('storeOpenGraphImage') ??
      DEFAULT_MERCH_STORE_SETTINGS.storeOpenGraphImage,
    navigationLabel:
      value('navigationLabel') ?? DEFAULT_MERCH_STORE_SETTINGS.navigationLabel,
    homepageSectionEnabled: readBoolean(
      value('homepageSectionEnabled'),
      DEFAULT_MERCH_STORE_SETTINGS.homepageSectionEnabled,
    ),
    homepageTitle:
      value('homepageTitle') ?? DEFAULT_MERCH_STORE_SETTINGS.homepageTitle,
    homepageDescription:
      value('homepageDescription') ?? DEFAULT_MERCH_STORE_SETTINGS.homepageDescription,
    homepageCtaLabel:
      value('homepageCtaLabel') ?? DEFAULT_MERCH_STORE_SETTINGS.homepageCtaLabel,
    homepageCtaUrl:
      value('homepageCtaUrl') ?? DEFAULT_MERCH_STORE_SETTINGS.homepageCtaUrl,
    openLinksInNewTab: readBoolean(
      value('openLinksInNewTab'),
      DEFAULT_MERCH_STORE_SETTINGS.openLinksInNewTab,
    ),
    showInArticles: readBoolean(
      value('showInArticles'),
      DEFAULT_MERCH_STORE_SETTINGS.showInArticles,
    ),
    announcementEnabled: readBoolean(
      value('announcementEnabled'),
      DEFAULT_MERCH_STORE_SETTINGS.announcementEnabled,
    ),
    announcementText:
      value('announcementText') ?? DEFAULT_MERCH_STORE_SETTINGS.announcementText,
    disclaimerText:
      value('disclaimerText') ?? DEFAULT_MERCH_STORE_SETTINGS.disclaimerText,
  };
}

export async function saveMerchStoreSettings(settings: MerchStoreSettings) {
  const entries = Object.entries(settings) as Array<
    [keyof MerchStoreSettings, MerchStoreSettings[keyof MerchStoreSettings]]
  >;
  await prisma.$transaction(
    entries.map(([key, value]) => {
      const definition = MERCH_SETTINGS[key];
      const serialized = typeof value === 'boolean' ? String(value) : value;
      return prisma.siteContent.upsert({
        where: { key: definition.key },
        create: {
          key: definition.key,
          label: definition.label,
          value: serialized,
          contentType: definition.contentType,
          group: 'Merch Store / Fourthwall',
        },
        update: {
          label: definition.label,
          value: serialized,
          contentType: definition.contentType,
          group: 'Merch Store / Fourthwall',
        },
      });
    }),
  );
  return getMerchStoreSettings();
}

export async function getMerchandiseProducts(): Promise<MerchandiseProductRecord[]> {
  return (
    await prisma.merchandiseProduct.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    })
  ).map(serializeMerchandiseProduct);
}

export async function createMerchandiseProduct(input: MerchandiseProductInput) {
  return prisma.merchandiseProduct.create({ data: input });
}

export async function updateMerchandiseProduct(
  id: string,
  input: MerchandiseProductInput,
) {
  await requireMerchandiseProduct(id);
  return prisma.merchandiseProduct.update({ where: { id }, data: input });
}

export async function deleteMerchandiseProduct(id: string) {
  await requireMerchandiseProduct(id);
  return prisma.merchandiseProduct.delete({ where: { id } });
}

export async function getHomepageMerchandise() {
  const settings = await getMerchStoreSettings();
  if (!isPublicMerchStore(settings) || !settings.homepageSectionEnabled) {
    return { settings, products: [] as MerchandiseProductRecord[] };
  }
  const products = await publicProducts({ homepageVisible: true }, 4);
  return { settings, products };
}

export async function getStoreMerchandise() {
  const settings = await getMerchStoreSettings();
  if (!isPublicMerchStore(settings)) {
    return { settings, products: [] as MerchandiseProductRecord[] };
  }
  return { settings, products: await publicProducts({ storeVisible: true }) };
}

export async function getArticleMerchandise(productIds: string[]) {
  const settings = await getMerchStoreSettings();
  if (!isPublicMerchStore(settings) || !settings.showInArticles || !productIds.length) {
    return { settings, products: [] as MerchandiseProductRecord[] };
  }
  return {
    settings,
    products: (
      await prisma.merchandiseProduct.findMany({
        where: {
          id: { in: Array.from(new Set(productIds)) },
          enabled: true,
          articleVisible: true,
        },
      })
    )
      .filter(isPublicMerchandiseProduct)
      .map(serializeMerchandiseProduct),
  };
}

export async function getEditorMerchandiseProducts() {
  return (
    await prisma.merchandiseProduct.findMany({
      orderBy: [{ displayOrder: 'asc' }, { title: 'asc' }],
    })
  ).map(serializeMerchandiseProduct);
}

async function publicProducts(
  visibility: { homepageVisible?: boolean; storeVisible?: boolean },
  take?: number,
) {
  const products = (
    await prisma.merchandiseProduct.findMany({
      where: { enabled: true, ...visibility },
      orderBy: [{ featured: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }],
    })
  )
    .filter(isPublicMerchandiseProduct)
    .map(serializeMerchandiseProduct);
  return take ? products.slice(0, take) : products;
}

function serializeMerchandiseProduct(
  product: MerchandiseProduct,
): MerchandiseProductRecord {
  return {
    ...product,
    productType: product.productType as MerchandiseProductRecord['productType'],
    source: product.source as MerchandiseProductRecord['source'],
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

async function requireMerchandiseProduct(id: string) {
  const product = await prisma.merchandiseProduct.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!product) throw new AdminDataError('Merchandise product not found.', 404);
}

function setting(key: string, label: string, contentType: string) {
  return { key, label, contentType };
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value === 'true';
}
