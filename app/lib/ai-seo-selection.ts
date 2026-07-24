import type {
  AiSeoArticleContext,
  AiSeoProductContext,
} from './ai-seo-types';

const PREFERRED_TIERS = [
  'Budget',
  'Best Value',
  'Premium',
  'Minimum',
  'Recommended',
  'Performance',
] as const;

const TOPIC_COMPONENT_TERMS: Array<{
  componentType: AiSeoProductContext['componentType'];
  terms: string[];
}> = [
  { componentType: 'GPU', terms: ['gpu', 'graphics', 'rtx', 'gtx', 'radeon'] },
  { componentType: 'CPU', terms: ['cpu', 'processor', 'ryzen', 'intel core'] },
  { componentType: 'RAM', terms: ['ram', 'memory', 'ddr4', 'ddr5'] },
  { componentType: 'Storage', terms: ['ssd', 'storage', 'nvme', 'hard drive', 'disk'] },
  { componentType: 'Prebuilt Desktop', terms: ['prebuilt', 'desktop', 'budget pc', 'gaming pc'] },
  { componentType: 'Gaming Laptop', terms: ['laptop', 'notebook'] },
  { componentType: 'Monitor', terms: ['monitor', 'display'] },
  { componentType: 'Controller', terms: ['controller', 'gamepad'] },
  { componentType: 'Keyboard', terms: ['keyboard'] },
  { componentType: 'Mouse', terms: ['mouse'] },
  { componentType: 'Headset', terms: ['headset', 'headphones'] },
  {
    componentType: 'Other',
    terms: ['capture card', 'streaming', 'webcam', 'microphone', 'stream deck'],
  },
];

export function selectProductsForSeo(
  products: AiSeoProductContext[],
  options: {
    topic: string;
    categoryTypes: AiSeoProductContext['componentType'][];
    specificProductIds: string[];
    maximum?: number;
  },
) {
  const maximum = Math.min(8, Math.max(0, options.maximum ?? 6));
  const byId = new Map(products.map((product) => [product.id, product]));
  const selected: AiSeoProductContext[] = [];
  const seen = new Set<string>();

  for (const id of options.specificProductIds) {
    const product = byId.get(id);
    if (product && !seen.has(id)) {
      selected.push(product);
      seen.add(id);
    }
  }

  const inferredCategories = inferProductCategories(options.topic);
  const requestedCategories = options.categoryTypes.length
    ? options.categoryTypes
    : inferredCategories;
  if (!requestedCategories.length) return selected.slice(0, maximum);

  for (const category of requestedCategories) {
    const categoryProducts = products
      .filter((product) => product.componentType === category && !seen.has(product.id))
      .sort((left, right) => {
        const tierDifference =
          tierIndex(left.valueTier) - tierIndex(right.valueTier);
        return tierDifference || left.title.localeCompare(right.title);
      });

    for (const tier of PREFERRED_TIERS) {
      const product = categoryProducts.find(
        (item) => item.valueTier === tier && !seen.has(item.id),
      );
      if (product) {
        selected.push(product);
        seen.add(product.id);
      }
      if (selected.length >= maximum) return selected.slice(0, maximum);
    }

    for (const product of categoryProducts) {
      if (!seen.has(product.id)) {
        selected.push(product);
        seen.add(product.id);
      }
      if (selected.length >= maximum) return selected.slice(0, maximum);
    }
  }

  return selected.slice(0, maximum);
}

export function selectRelatedArticleCandidates(
  articles: AiSeoArticleContext[],
  options: {
    topic: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    selectedArticleIds: string[];
    maximum?: number;
  },
) {
  const maximum = Math.min(30, Math.max(1, options.maximum ?? 20));
  const byId = new Map(articles.map((article) => [article.id, article]));
  const selected: AiSeoArticleContext[] = [];
  const seen = new Set<string>();

  for (const id of options.selectedArticleIds) {
    const article = byId.get(id);
    if (article && !seen.has(id)) {
      selected.push(article);
      seen.add(id);
    }
  }

  const queryTokens = keywords(
    [
      options.topic,
      options.primaryKeyword,
      ...options.secondaryKeywords,
    ].join(' '),
  );
  const ranked = articles
    .filter((article) => !seen.has(article.id))
    .map((article) => ({
      article,
      score: relevanceScore(article, queryTokens),
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.article.title.localeCompare(right.article.title),
    );

  for (const item of ranked) {
    if (item.score <= 0 && selected.length >= 3) break;
    selected.push(item.article);
    seen.add(item.article.id);
    if (selected.length >= maximum) break;
  }

  return selected.slice(0, maximum);
}

export async function createAvailableSlug(
  requested: string,
  isTaken: (slug: string) => Promise<boolean>,
) {
  const base = normalizeSlug(requested) || 'gta-6-pc-guide';
  if (!(await isTaken(base))) return base;
  for (let suffix = 2; suffix <= 10_000; suffix += 1) {
    const candidate = `${base.slice(0, Math.max(1, 100 - String(suffix).length - 1))}-${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error('A unique article slug could not be generated.');
}

export type AiSeoBatchStatus = 'Waiting' | 'Generating' | 'Saved' | 'Failed';

export interface AiSeoBatchResult<T> {
  topic: string;
  status: 'Saved' | 'Failed';
  value?: T;
  error?: string;
}

export async function runAiSeoBatch<T>(
  topics: string[],
  generate: (topic: string, index: number) => Promise<T>,
  onStatus?: (index: number, status: AiSeoBatchStatus, detail?: T | string) => void,
  concurrency = 2,
) {
  const results = new Array<AiSeoBatchResult<T>>(topics.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < topics.length) {
      const index = nextIndex;
      nextIndex += 1;
      const topic = topics[index];
      onStatus?.(index, 'Generating');
      try {
        const value = await generate(topic, index);
        results[index] = { topic, status: 'Saved', value };
        onStatus?.(index, 'Saved', value);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Generation failed.';
        results[index] = { topic, status: 'Failed', error: message };
        onStatus?.(index, 'Failed', message);
      }
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(topics.length, Math.max(1, Math.floor(concurrency))) },
      () => worker(),
    ),
  );
  return results;
}

function inferProductCategories(topic: string) {
  const normalized = topic.toLowerCase();
  return TOPIC_COMPONENT_TERMS.filter(({ terms }) =>
    terms.some((term) => normalized.includes(term)),
  ).map(({ componentType }) => componentType);
}

function tierIndex(value: AiSeoProductContext['valueTier']) {
  const index = PREFERRED_TIERS.indexOf(value as (typeof PREFERRED_TIERS)[number]);
  return index < 0 ? PREFERRED_TIERS.length : index;
}

function relevanceScore(article: AiSeoArticleContext, queryTokens: Set<string>) {
  const titleTokens = keywords(article.title);
  const supportingTokens = keywords(
    `${article.excerpt} ${article.focusKeyword} ${article.categories.join(' ')}`,
  );
  let score = 0;
  for (const token of queryTokens) {
    if (titleTokens.has(token)) score += 5;
    if (supportingTokens.has(token)) score += 2;
  }
  return score;
}

function keywords(value: string) {
  return new Set(
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
  );
}

function normalizeSlug(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

const STOP_WORDS = new Set([
  'and',
  'are',
  'best',
  'can',
  'for',
  'from',
  'gta',
  'guide',
  'how',
  'the',
  'this',
  'with',
  'your',
]);
