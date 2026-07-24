import type { CoreRecommendationScenarioCode } from './recommendation-scenarios';
import { getDefaultSectionId } from './recommendation-sections';
import type {
  ProductComponentType,
  ProductValueTier,
  RecommendationSectionLayout,
} from '../lib/affiliate-types';

export const PRODUCT_VALUE_TIER_ORDER = [
  'Minimum',
  'Budget',
  'Best Value',
  'Recommended',
  'Performance',
  'Premium',
] as const satisfies readonly ProductValueTier[];

export type RecommendationRuleMode = 'AUTOMATIC' | 'MANUAL';
export type RecommendationRuleSource = 'LAUNCH_DEFAULT' | 'MANUAL';
export type RecommendationRuleSortOrder =
  | 'TIER_DIVERSITY'
  | 'COMPONENT_DIVERSITY'
  | 'ADMIN_ORDER';
export type RecommendationRulePurpose =
  | 'GENERAL'
  | 'PREBUILT'
  | 'GAME_PURCHASE'
  | 'GUIDANCE';
export type RecommendationRuleComponentType =
  | ProductComponentType
  | 'Gaming Desktop'
  | 'Prebuilt Laptop';
export type CreatorDerivedCategory =
  | 'AUDIO'
  | 'CAMERA'
  | 'LIGHTING'
  | 'STREAM_CONTROLLER'
  | 'CREATOR_ACCESSORY';

export interface RecommendationRuleDefinition {
  key: string;
  title: string;
  description: string;
  componentTypes: RecommendationRuleComponentType[];
  valueTiers: ProductValueTier[];
  tierPriority: ProductValueTier[];
  fallbackComponentTypes: RecommendationRuleComponentType[];
  fallbackValueTiers: ProductValueTier[];
  maxProducts: number;
  sortOrder: RecommendationRuleSortOrder;
  layout: RecommendationSectionLayout;
  purpose: RecommendationRulePurpose;
  collapsedByDefault: boolean;
  sourceSectionId: string | null;
  emptyStateTitle: string;
  emptyStateDescription: string;
  emptyCtaLabel: string;
  emptyCtaUrl: string;
}

export interface CreatorRuleDefinition {
  key: string;
  title: string;
  description: string;
  componentTypes: RecommendationRuleComponentType[];
  valueTiers: ProductValueTier[];
  tierPriority: ProductValueTier[];
  derivedCategories: CreatorDerivedCategory[];
  maxProducts: number;
}

const TIERS = {
  value: ['Budget', 'Best Value', 'Recommended'] as ProductValueTier[],
  upgrade: ['Budget', 'Best Value', 'Recommended', 'Performance'] as ProductValueTier[],
  premium: ['Best Value', 'Recommended', 'Performance', 'Premium'] as ProductValueTier[],
  allUseful: ['Budget', 'Best Value', 'Recommended', 'Performance', 'Premium'] as ProductValueTier[],
};
const PREBUILT_TYPES: RecommendationRuleComponentType[] = [
  'Gaming Desktop',
  'Gaming Laptop',
  'Prebuilt Desktop',
  'Prebuilt Laptop',
];

function rule(
  scenario: CoreRecommendationScenarioCode,
  definition: Omit<
    RecommendationRuleDefinition,
    | 'fallbackComponentTypes'
    | 'fallbackValueTiers'
    | 'layout'
    | 'purpose'
    | 'collapsedByDefault'
    | 'sourceSectionId'
    | 'emptyStateTitle'
    | 'emptyStateDescription'
    | 'emptyCtaLabel'
    | 'emptyCtaUrl'
  > & {
    fallbackComponentTypes?: RecommendationRuleComponentType[];
    fallbackValueTiers?: ProductValueTier[];
    layout?: RecommendationSectionLayout;
    purpose?: RecommendationRulePurpose;
    collapsedByDefault?: boolean;
    sourceSectionKey?: string;
    emptyStateTitle?: string;
    emptyStateDescription?: string;
    emptyCtaLabel?: string;
    emptyCtaUrl?: string;
  },
): RecommendationRuleDefinition {
  return {
    ...definition,
    fallbackComponentTypes: definition.fallbackComponentTypes ?? [],
    fallbackValueTiers: definition.fallbackValueTiers ?? [],
    layout: definition.layout ?? 'grid',
    purpose: definition.purpose ?? 'GENERAL',
    collapsedByDefault: definition.collapsedByDefault ?? false,
    sourceSectionId: definition.sourceSectionKey
      ? getDefaultSectionId(scenario, definition.sourceSectionKey)
      : null,
    emptyStateTitle: definition.emptyStateTitle ?? '',
    emptyStateDescription: definition.emptyStateDescription ?? '',
    emptyCtaLabel: definition.emptyCtaLabel ?? '',
    emptyCtaUrl: definition.emptyCtaUrl ?? '',
  };
}

function prebuiltRule(
  scenario: CoreRecommendationScenarioCode,
  key = 'complete-gaming-pcs',
  title = 'Prebuilt Gaming PCs',
  maxProducts = 3,
  sourceSectionKey = 'budget-gaming-desktops',
) {
  return rule(scenario, {
    key,
    title,
    description:
      'Complete gaming desktops and laptops for players who prefer not to replace individual parts.',
    componentTypes: PREBUILT_TYPES,
    valueTiers: ['Budget', 'Best Value', 'Recommended'],
    tierPriority: ['Budget', 'Best Value', 'Recommended', 'Premium'],
    fallbackValueTiers: ['Premium', 'Performance'],
    maxProducts,
    sortOrder: 'TIER_DIVERSITY',
    purpose: 'PREBUILT',
    collapsedByDefault: true,
    sourceSectionKey,
  });
}

function purchaseRule(
  scenario: 'PASS_RECOMMENDED' | 'PASS_MINIMUM',
): RecommendationRuleDefinition {
  return rule(scenario, {
    key: 'gta-vi-purchase',
    title: 'Ready for GTA VI?',
    description: 'Official purchase or preorder links enabled by the site owner.',
    componentTypes: ['Game'],
    valueTiers: [],
    tierPriority: [],
    maxProducts: 3,
    sortOrder: 'ADMIN_ORDER',
    purpose: 'GAME_PURCHASE',
    collapsedByDefault: true,
    sourceSectionKey: 'gta-vi-purchase',
  });
}

export const RECOMMENDATION_LAUNCH_RULES: Record<
  CoreRecommendationScenarioCode,
  RecommendationRuleDefinition[]
> = {
  PASS_RECOMMENDED: [
    rule('PASS_RECOMMENDED', {
      key: 'complete-your-gaming-setup',
      title: 'Complete Your Gaming Setup',
      description:
        'Useful accessories and storage additions for a PC that already meets the recommended target.',
      componentTypes: ['Headset', 'Keyboard', 'Mouse', 'Monitor', 'Storage'],
      valueTiers: TIERS.premium,
      tierPriority: ['Best Value', 'Recommended', 'Performance', 'Premium'],
      maxProducts: 6,
      sortOrder: 'COMPONENT_DIVERSITY',
      sourceSectionKey: 'recommended-accessories',
    }),
    rule('PASS_RECOMMENDED', {
      key: 'optional-performance-upgrades',
      title: 'Optional Performance Upgrades',
      description:
        'Premium upgrades for additional performance headroom; these are optional for this result.',
      componentTypes: ['GPU', 'CPU', 'RAM', 'Storage'],
      valueTiers: ['Performance', 'Premium'],
      tierPriority: ['Performance', 'Premium'],
      maxProducts: 3,
      sortOrder: 'COMPONENT_DIVERSITY',
      collapsedByDefault: true,
      sourceSectionKey: 'storage-upgrades',
    }),
    purchaseRule('PASS_RECOMMENDED'),
  ],
  PASS_MINIMUM: [
    rule('PASS_MINIMUM', {
      key: 'best-next-upgrades',
      title: 'Best Next Upgrades',
      description:
        'Value-focused upgrades that can create more performance headroom for GTA VI.',
      componentTypes: ['GPU', 'CPU', 'RAM', 'Storage'],
      valueTiers: TIERS.value,
      tierPriority: ['Best Value', 'Recommended', 'Budget'],
      fallbackValueTiers: ['Performance'],
      maxProducts: 4,
      sortOrder: 'COMPONENT_DIVERSITY',
      sourceSectionKey: 'recommended-upgrades',
    }),
    rule('PASS_MINIMUM', {
      key: 'affordable-gaming-essentials',
      title: 'Affordable Gaming Essentials',
      description: 'Practical accessories that improve a gaming setup without overbuilding it.',
      componentTypes: ['Headset', 'Keyboard', 'Mouse'],
      valueTiers: ['Budget', 'Best Value'],
      tierPriority: ['Best Value', 'Budget'],
      maxProducts: 3,
      sortOrder: 'COMPONENT_DIVERSITY',
      collapsedByDefault: true,
      sourceSectionKey: 'recommended-upgrades',
    }),
    purchaseRule('PASS_MINIMUM'),
  ],
  FAIL_GPU: [
    rule('FAIL_GPU', {
      key: 'gpu-upgrades',
      title: 'GPU Upgrades',
      description:
        'Graphics-card upgrades selected to move beyond the estimated minimum requirement.',
      componentTypes: ['GPU'],
      valueTiers: ['Budget', 'Best Value', 'Performance'],
      tierPriority: ['Budget', 'Best Value', 'Performance'],
      fallbackValueTiers: ['Recommended', 'Premium'],
      maxProducts: 3,
      sortOrder: 'TIER_DIVERSITY',
      sourceSectionKey: 'gpu-upgrades',
    }),
    prebuiltRule('FAIL_GPU'),
  ],
  FAIL_CPU: [
    rule('FAIL_CPU', {
      key: 'cpu-upgrades',
      title: 'CPU Upgrades',
      description:
        'Processor upgrades selected to move beyond the estimated minimum requirement.',
      componentTypes: ['CPU'],
      valueTiers: TIERS.upgrade,
      tierPriority: ['Budget', 'Best Value', 'Recommended', 'Performance'],
      fallbackValueTiers: ['Premium', 'Minimum'],
      maxProducts: 3,
      sortOrder: 'TIER_DIVERSITY',
      sourceSectionKey: 'cpu-upgrades',
    }),
    prebuiltRule('FAIL_CPU'),
  ],
  FAIL_RAM: [
    rule('FAIL_RAM', {
      key: 'ram-upgrades',
      title: 'RAM Upgrades',
      description: 'Memory kits selected for gaming and multitasking headroom.',
      componentTypes: ['RAM'],
      valueTiers: ['Budget', 'Best Value', 'Recommended', 'Premium'],
      tierPriority: ['Best Value', 'Recommended', 'Budget', 'Premium'],
      fallbackValueTiers: ['Performance', 'Minimum'],
      maxProducts: 3,
      sortOrder: 'TIER_DIVERSITY',
      sourceSectionKey: 'ram-upgrades',
    }),
    prebuiltRule('FAIL_RAM'),
  ],
  FAIL_STORAGE: [
    rule('FAIL_STORAGE', {
      key: 'storage-upgrades',
      title: 'Storage Upgrades',
      description: 'SSD options selected for GTA VI capacity and loading performance.',
      componentTypes: ['Storage'],
      valueTiers: TIERS.allUseful,
      tierPriority: ['Budget', 'Best Value', 'Recommended', 'Performance', 'Premium'],
      fallbackValueTiers: ['Minimum'],
      maxProducts: 3,
      sortOrder: 'TIER_DIVERSITY',
      sourceSectionKey: 'storage-upgrades',
    }),
    prebuiltRule('FAIL_STORAGE'),
  ],
  FAIL_CPU_GPU: [
    rule('FAIL_CPU_GPU', {
      key: 'gpu-upgrades',
      title: 'GPU Upgrades',
      description: 'Graphics upgrades for the failing GPU.',
      componentTypes: ['GPU'],
      valueTiers: ['Budget', 'Best Value', 'Performance'],
      tierPriority: ['Budget', 'Best Value', 'Performance'],
      fallbackValueTiers: ['Recommended', 'Premium'],
      maxProducts: 3,
      sortOrder: 'TIER_DIVERSITY',
      sourceSectionKey: 'cpu-gpu-upgrades',
    }),
    rule('FAIL_CPU_GPU', {
      key: 'cpu-upgrades',
      title: 'CPU Upgrades',
      description: 'Processor upgrades for the failing CPU.',
      componentTypes: ['CPU'],
      valueTiers: ['Budget', 'Best Value', 'Recommended'],
      tierPriority: ['Budget', 'Best Value', 'Recommended'],
      fallbackValueTiers: ['Performance', 'Premium'],
      maxProducts: 3,
      sortOrder: 'TIER_DIVERSITY',
      sourceSectionKey: 'cpu-gpu-upgrades',
    }),
    prebuiltRule('FAIL_CPU_GPU', 'complete-gaming-pcs', 'Complete Gaming PCs'),
  ],
  FAIL_GPU_RAM: [
    rule('FAIL_GPU_RAM', {
      key: 'gpu-upgrades',
      title: 'GPU Upgrades',
      description: 'Graphics upgrades for the failing GPU.',
      componentTypes: ['GPU'],
      valueTiers: ['Budget', 'Best Value', 'Performance'],
      tierPriority: ['Budget', 'Best Value', 'Performance'],
      fallbackValueTiers: ['Recommended', 'Premium'],
      maxProducts: 3,
      sortOrder: 'TIER_DIVERSITY',
      sourceSectionKey: 'gpu-ram-upgrades',
    }),
    rule('FAIL_GPU_RAM', {
      key: 'ram-upgrades',
      title: 'RAM Upgrades',
      description: 'Memory upgrades for the failing RAM result.',
      componentTypes: ['RAM'],
      valueTiers: ['Budget', 'Best Value', 'Recommended', 'Premium'],
      tierPriority: ['Best Value', 'Recommended', 'Budget', 'Premium'],
      fallbackValueTiers: ['Minimum', 'Performance'],
      maxProducts: 3,
      sortOrder: 'TIER_DIVERSITY',
      sourceSectionKey: 'gpu-ram-upgrades',
    }),
    prebuiltRule('FAIL_GPU_RAM', 'complete-gaming-pcs', 'Complete Gaming PCs'),
  ],
  FAIL_CPU_RAM: [
    rule('FAIL_CPU_RAM', {
      key: 'cpu-upgrades',
      title: 'CPU Upgrades',
      description: 'Processor upgrades for the failing CPU.',
      componentTypes: ['CPU'],
      valueTiers: ['Budget', 'Best Value', 'Recommended'],
      tierPriority: ['Budget', 'Best Value', 'Recommended'],
      fallbackValueTiers: ['Performance', 'Premium'],
      maxProducts: 3,
      sortOrder: 'TIER_DIVERSITY',
      sourceSectionKey: 'cpu-ram-upgrades',
    }),
    rule('FAIL_CPU_RAM', {
      key: 'ram-upgrades',
      title: 'RAM Upgrades',
      description: 'Memory upgrades for the failing RAM result.',
      componentTypes: ['RAM'],
      valueTiers: ['Budget', 'Best Value', 'Recommended', 'Premium'],
      tierPriority: ['Best Value', 'Recommended', 'Budget', 'Premium'],
      fallbackValueTiers: ['Minimum', 'Performance'],
      maxProducts: 3,
      sortOrder: 'TIER_DIVERSITY',
      sourceSectionKey: 'cpu-ram-upgrades',
    }),
    prebuiltRule('FAIL_CPU_RAM', 'complete-gaming-pcs', 'Complete Gaming PCs'),
  ],
  FAIL_MULTIPLE: [
    prebuiltRule(
      'FAIL_MULTIPLE',
      'complete-gaming-pcs',
      'Complete Gaming PCs',
      4,
      'complete-gaming-pcs',
    ),
    rule('FAIL_MULTIPLE', {
      key: 'most-important-component-upgrades',
      title: 'Most Important Component Upgrades',
      description:
        'A short, balanced list of core upgrades for the components most likely to hold the PC back.',
      componentTypes: ['GPU', 'CPU', 'RAM', 'Storage'],
      valueTiers: TIERS.value,
      tierPriority: ['Best Value', 'Recommended', 'Budget'],
      fallbackValueTiers: ['Performance'],
      maxProducts: 4,
      sortOrder: 'COMPONENT_DIVERSITY',
      sourceSectionKey: 'complete-gaming-pcs',
    }),
  ],
  UNKNOWN_GPU: [
    rule('UNKNOWN_GPU', {
      key: 'verify-your-gpu',
      title: 'Verify Your GPU',
      description:
        'We could not identify the GPU, so confirm it before deciding whether an upgrade is needed.',
      componentTypes: [],
      valueTiers: [],
      tierPriority: [],
      maxProducts: 0,
      sortOrder: 'ADMIN_ORDER',
      purpose: 'GUIDANCE',
      emptyCtaLabel: 'Enter GPU Manually',
      emptyCtaUrl: '/manual',
      emptyStateTitle: 'Confirm your graphics card first',
      emptyStateDescription: 'A confirmed GPU prevents unnecessary upgrade recommendations.',
    }),
    rule('UNKNOWN_GPU', {
      key: 'common-gpu-options',
      title: 'Common GPU Upgrade Options',
      description:
        'Common graphics options for comparison; the current GPU has not been confirmed.',
      componentTypes: ['GPU'],
      valueTiers: TIERS.value,
      tierPriority: ['Budget', 'Best Value', 'Recommended'],
      fallbackValueTiers: ['Performance'],
      maxProducts: 3,
      sortOrder: 'TIER_DIVERSITY',
      sourceSectionKey: 'gpu-options',
    }),
  ],
  UNKNOWN_CPU: [
    rule('UNKNOWN_CPU', {
      key: 'verify-your-cpu',
      title: 'Verify Your CPU',
      description:
        'We could not identify the CPU, so confirm it before deciding whether an upgrade is needed.',
      componentTypes: [],
      valueTiers: [],
      tierPriority: [],
      maxProducts: 0,
      sortOrder: 'ADMIN_ORDER',
      purpose: 'GUIDANCE',
      emptyCtaLabel: 'Enter CPU Manually',
      emptyCtaUrl: '/manual',
      emptyStateTitle: 'Confirm your processor first',
      emptyStateDescription: 'A confirmed CPU prevents unnecessary upgrade recommendations.',
    }),
    rule('UNKNOWN_CPU', {
      key: 'common-cpu-options',
      title: 'Common CPU Upgrade Options',
      description:
        'Common processor options for comparison; the current CPU has not been confirmed.',
      componentTypes: ['CPU'],
      valueTiers: TIERS.value,
      tierPriority: ['Budget', 'Best Value', 'Recommended'],
      fallbackValueTiers: ['Performance'],
      maxProducts: 3,
      sortOrder: 'TIER_DIVERSITY',
      sourceSectionKey: 'cpu-options',
    }),
  ],
  UNKNOWN_RAM: [
    rule('UNKNOWN_RAM', {
      key: 'verify-your-ram',
      title: 'Verify Your RAM',
      description:
        'We could not identify installed memory, so confirm it before deciding whether an upgrade is needed.',
      componentTypes: [],
      valueTiers: [],
      tierPriority: [],
      maxProducts: 0,
      sortOrder: 'ADMIN_ORDER',
      purpose: 'GUIDANCE',
      emptyCtaLabel: 'Enter RAM Manually',
      emptyCtaUrl: '/manual',
      emptyStateTitle: 'Confirm installed memory first',
      emptyStateDescription: 'A confirmed RAM value prevents unnecessary upgrade recommendations.',
    }),
    rule('UNKNOWN_RAM', {
      key: 'common-ram-options',
      title: 'Common RAM Upgrade Options',
      description:
        'Common memory options for comparison; installed RAM has not been confirmed.',
      componentTypes: ['RAM'],
      valueTiers: ['Budget', 'Best Value', 'Recommended'],
      tierPriority: ['Best Value', 'Recommended', 'Budget'],
      fallbackValueTiers: ['Premium', 'Minimum'],
      maxProducts: 3,
      sortOrder: 'TIER_DIVERSITY',
      sourceSectionKey: 'ram-options',
    }),
  ],
  UNKNOWN_STORAGE: [
    rule('UNKNOWN_STORAGE', {
      key: 'verify-your-storage',
      title: 'Verify Your Storage',
      description:
        'Storage was not detected. Confirm capacity and drive type before deciding whether an upgrade is needed.',
      componentTypes: [],
      valueTiers: [],
      tierPriority: [],
      maxProducts: 0,
      sortOrder: 'ADMIN_ORDER',
      purpose: 'GUIDANCE',
      emptyCtaLabel: 'Enter Storage Manually',
      emptyCtaUrl: '/manual',
      emptyStateTitle: 'Confirm storage capacity and type',
      emptyStateDescription: 'Storage can remain unknown without changing the compatibility verdict.',
    }),
    rule('UNKNOWN_STORAGE', {
      key: 'common-storage-options',
      title: 'Common Storage Options',
      description:
        'Common SSD options for comparison; current storage has not been confirmed.',
      componentTypes: ['Storage'],
      valueTiers: TIERS.value,
      tierPriority: ['Budget', 'Best Value', 'Recommended'],
      fallbackValueTiers: ['Performance', 'Premium', 'Minimum'],
      maxProducts: 3,
      sortOrder: 'TIER_DIVERSITY',
      sourceSectionKey: 'storage-options',
    }),
  ],
  CANNOT_DETERMINE: [
    rule('CANNOT_DETERMINE', {
      key: 'verify-your-pc-specifications',
      title: 'Verify Your PC Specifications',
      description:
        'We need confirmed CPU, GPU, and RAM details before making a confident upgrade recommendation.',
      componentTypes: [],
      valueTiers: [],
      tierPriority: [],
      maxProducts: 0,
      sortOrder: 'ADMIN_ORDER',
      purpose: 'GUIDANCE',
      emptyCtaLabel: 'Enter Specs Manually',
      emptyCtaUrl: '/manual',
      emptyStateTitle: 'Confirm the missing specifications',
      emptyStateDescription: 'Use manual entry or the PC-spec guide before buying upgrades.',
    }),
    rule('CANNOT_DETERMINE', {
      key: 'popular-starting-points',
      title: 'Popular Starting Points',
      description:
        'Common value-focused hardware for comparison only; compatibility has not been confirmed.',
      componentTypes: ['GPU', 'RAM', 'Storage'],
      valueTiers: TIERS.value,
      tierPriority: ['Best Value', 'Recommended', 'Budget'],
      fallbackValueTiers: ['Performance'],
      maxProducts: 3,
      sortOrder: 'COMPONENT_DIVERSITY',
      sourceSectionKey: 'popular-gaming-pcs',
    }),
  ],
};

function creatorRule(
  key: string,
  title: string,
  description: string,
  componentTypes: RecommendationRuleComponentType[],
  derivedCategories: CreatorDerivedCategory[],
  valueTiers: ProductValueTier[],
  maxProducts = 3,
): CreatorRuleDefinition {
  return {
    key,
    title,
    description,
    componentTypes,
    derivedCategories,
    valueTiers,
    tierPriority: PRODUCT_VALUE_TIER_ORDER.filter((tier) => valueTiers.includes(tier)),
    maxProducts,
  };
}

const CREATOR_ACCESSORIES = [
  creatorRule(
    'audio-that-viewers-notice',
    'Audio That Viewers Notice',
    'Headsets and microphones for clearer monitoring and voice audio.',
    ['Headset', 'Other'],
    ['AUDIO'],
    TIERS.premium,
  ),
  creatorRule(
    'camera-and-stream-control',
    'Camera and Stream Control',
    'Camera and workflow tools that make a stream easier to manage.',
    ['Other'],
    ['CAMERA', 'LIGHTING', 'STREAM_CONTROLLER'],
    TIERS.allUseful,
  ),
];

const CREATOR_PERFORMANCE: Partial<
  Record<CoreRecommendationScenarioCode, CreatorRuleDefinition>
> = {
  PASS_MINIMUM: creatorRule(
    'stream-performance-upgrades',
    'Stream Performance Upgrades',
    'Core upgrades that add headroom for GTA VI, OBS, recording, and multitasking.',
    ['GPU', 'CPU', 'RAM', 'Storage'],
    [],
    TIERS.value,
    3,
  ),
  FAIL_GPU: creatorRule(
    'stream-performance-upgrades',
    'Fix the GPU First',
    'Graphics options to address the confirmed GPU bottleneck before streaming.',
    ['GPU'],
    [],
    ['Budget', 'Best Value', 'Recommended', 'Performance'],
  ),
  FAIL_CPU: creatorRule(
    'stream-performance-upgrades',
    'Fix the CPU First',
    'Processor options to address the confirmed CPU bottleneck before streaming.',
    ['CPU'],
    [],
    TIERS.upgrade,
  ),
  FAIL_RAM: creatorRule(
    'stream-performance-upgrades',
    'Add Memory First',
    'Memory kits for gaming, OBS, browser sources, and creator applications.',
    ['RAM'],
    [],
    ['Best Value', 'Recommended', 'Premium'],
  ),
  FAIL_STORAGE: creatorRule(
    'storage-for-recordings',
    'Storage for Recordings',
    'Fast storage for GTA VI, recorded footage, clips, and editing projects.',
    ['Storage'],
    [],
    TIERS.allUseful,
  ),
  FAIL_CPU_GPU: creatorRule(
    'stream-performance-upgrades',
    'Fix CPU and GPU Headroom First',
    'Balanced CPU and GPU options for gameplay and streaming workloads.',
    ['CPU', 'GPU'],
    [],
    TIERS.upgrade,
  ),
  FAIL_GPU_RAM: creatorRule(
    'stream-performance-upgrades',
    'Fix GPU and Memory Headroom First',
    'Graphics and memory options for gameplay and streaming workloads.',
    ['GPU', 'RAM'],
    [],
    TIERS.upgrade,
  ),
  FAIL_CPU_RAM: creatorRule(
    'stream-performance-upgrades',
    'Fix CPU and Memory Headroom First',
    'Processor and memory options for gameplay and streaming workloads.',
    ['CPU', 'RAM'],
    [],
    TIERS.upgrade,
  ),
  FAIL_MULTIPLE: creatorRule(
    'stream-performance-upgrades',
    'Build the Core PC First',
    'A concise set of core upgrades before spending on creator accessories.',
    ['GPU', 'CPU', 'RAM', 'Storage', ...PREBUILT_TYPES],
    [],
    TIERS.value,
    4,
  ),
};

export function getCreatorLaunchRules(
  scenario: CoreRecommendationScenarioCode,
): CreatorRuleDefinition[] {
  if (
    scenario === 'UNKNOWN_GPU' ||
    scenario === 'UNKNOWN_CPU' ||
    scenario === 'UNKNOWN_RAM' ||
    scenario === 'UNKNOWN_STORAGE' ||
    scenario === 'CANNOT_DETERMINE'
  ) {
    return [];
  }

  if (scenario === 'PASS_RECOMMENDED') {
    return [
      ...CREATOR_ACCESSORIES,
      creatorRule(
        'see-game-chat-and-obs',
        'See Your Game, Chat, and OBS at Once',
        'Displays and storage that improve a creator workspace.',
        ['Monitor', 'Storage'],
        [],
        TIERS.premium,
      ),
    ];
  }

  const performance = CREATOR_PERFORMANCE[scenario];
  return performance ? [performance, ...CREATOR_ACCESSORIES] : [...CREATOR_ACCESSORIES];
}

export function getRecommendationRuleId(
  scenario: CoreRecommendationScenarioCode,
  key: string,
) {
  return `rule-${scenario.toLowerCase().replaceAll('_', '-')}-${key}`;
}

export function getCreatorRuleId(
  scenario: CoreRecommendationScenarioCode,
  key: string,
) {
  return `creator-rule-${scenario.toLowerCase().replaceAll('_', '-')}-${key}`;
}
