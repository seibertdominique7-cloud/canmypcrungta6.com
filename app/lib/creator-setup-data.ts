import 'server-only';

import type { ProductRecord } from './affiliate-types';
import { getCatalogProducts } from './catalog-data';
import {
  buildCreatorSetupPlan,
  isCreatorSetupProduct,
} from './creator-setup-builder';

export async function getCreatorSetupCatalog(): Promise<ProductRecord[]> {
  const products = await getCatalogProducts();
  return products
    .filter(isCreatorSetupProduct)
    .map((product) => ({ ...product, usage: [] }));
}

export async function getCreatorGuideProducts() {
  const products = await getCreatorSetupCatalog();
  const plan = buildCreatorSetupPlan(products, {
    budget: '250_500',
    ownedGear: ['GAMING_PC'],
    goal: 'STREAM_RECORD',
    priority: 'BALANCED',
  });

  return [
    ...plan.essentials,
    ...plan.nextUpgrades,
    ...plan.futureUpgrades,
  ].slice(0, 6);
}
