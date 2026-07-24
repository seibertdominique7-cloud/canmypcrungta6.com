export const RECOMMENDATION_SECTION_LAYOUTS = [
  'grid',
  'horizontal',
  'featured',
] as const;

export const RECOMMENDATION_SECTION_PURPOSES = [
  'GENERAL',
  'GAME_PURCHASE',
  'PREBUILT',
  'GUIDANCE',
] as const;

export type RecommendationSectionLayout =
  (typeof RECOMMENDATION_SECTION_LAYOUTS)[number];
export type RecommendationSectionPurpose =
  (typeof RECOMMENDATION_SECTION_PURPOSES)[number];

export interface DefaultRecommendationSection {
  key: string;
  title: string;
  description: string;
  layout: RecommendationSectionLayout;
  purpose: RecommendationSectionPurpose;
  maxProducts: number;
  collapsedByDefault: boolean;
}

const purchase = section(
  'gta-vi-purchase',
  'GTA VI Purchase',
  'Official purchase or preorder links added by the site owner.',
  'featured',
  'GAME_PURCHASE',
  3,
);
const budgetDesktops = section(
  'budget-gaming-desktops',
  'Budget Gaming Desktops',
  'Value-focused complete gaming desktops.',
  'grid',
  'PREBUILT',
  4,
  true,
);
const highEndDesktops = section(
  'high-end-gaming-desktops',
  'High-End Gaming Desktops',
  'Higher-performance complete gaming desktops.',
  'grid',
  'PREBUILT',
  4,
  true,
);
const budgetLaptops = section(
  'budget-gaming-laptops',
  'Budget Gaming Laptops',
  'Value-focused portable gaming PCs.',
  'grid',
  'PREBUILT',
  4,
  true,
);
const highEndLaptops = section(
  'high-end-gaming-laptops',
  'High-End Gaming Laptops',
  'Higher-performance portable gaming PCs.',
  'grid',
  'PREBUILT',
  4,
  true,
);

export const DEFAULT_RECOMMENDATION_SECTIONS: Record<
  string,
  readonly DefaultRecommendationSection[]
> = {
  PASS_RECOMMENDED: [
    purchase,
    section(
      'recommended-accessories',
      'Recommended Accessories',
      'Useful additions for a PC that already meets the recommended target.',
      'grid',
      'GENERAL',
      3,
    ),
    section(
      'storage-upgrades',
      'Storage Upgrades',
      'Optional storage upgrades for more game space and faster loading.',
      'grid',
      'GENERAL',
      3,
      true,
    ),
    section(
      'gaming-monitors',
      'Gaming Monitors',
      'Displays suited to a recommended-level gaming PC.',
      'horizontal',
      'GENERAL',
      4,
      true,
    ),
    section(
      'shopping-for-another-gaming-pc',
      'Shopping for Another Gaming PC',
      'Optional complete gaming-PC recommendations.',
      'grid',
      'PREBUILT',
      4,
      true,
    ),
  ],
  PASS_MINIMUM: [
    section(
      'recommended-upgrades',
      'Recommended Upgrades',
      'The most relevant upgrades for smoother performance.',
      'grid',
      'GENERAL',
      3,
    ),
    purchase,
    budgetDesktops,
    budgetLaptops,
    section(
      'performance-gaming-pcs',
      'Performance Gaming PCs',
      'Complete systems intended for stronger gaming performance.',
      'grid',
      'PREBUILT',
      4,
      true,
    ),
  ],
  FAIL_GPU: [
    section('gpu-upgrades', 'GPU Upgrades', 'Graphics-card upgrades that meet the estimated target.'),
    budgetDesktops,
    highEndDesktops,
    budgetLaptops,
    highEndLaptops,
  ],
  FAIL_CPU: [
    section('cpu-upgrades', 'CPU Upgrades', 'Processor upgrades that meet the estimated target.'),
    budgetDesktops,
    highEndDesktops,
  ],
  FAIL_RAM: [
    section('ram-upgrades', 'RAM Upgrades', 'Memory upgrades that meet the estimated target.'),
    budgetDesktops,
    budgetLaptops,
  ],
  FAIL_STORAGE: [
    section('storage-upgrades', 'Storage Upgrades', 'Storage options that meet the estimated capacity target.'),
    budgetDesktops,
    budgetLaptops,
  ],
  FAIL_CPU_GPU: [
    section('cpu-gpu-upgrades', 'CPU and GPU Upgrades', 'Upgrade options for both failing components.'),
    budgetDesktops,
    highEndDesktops,
    budgetLaptops,
    highEndLaptops,
  ],
  FAIL_GPU_RAM: [
    section('gpu-ram-upgrades', 'GPU and RAM Upgrades', 'Upgrade options for both failing components.'),
    budgetDesktops,
    highEndDesktops,
    budgetLaptops,
  ],
  FAIL_CPU_RAM: [
    section('cpu-ram-upgrades', 'CPU and RAM Upgrades', 'Upgrade options for both failing components.'),
    budgetDesktops,
    highEndDesktops,
    budgetLaptops,
  ],
  FAIL_MULTIPLE: [
    section('complete-gaming-pcs', 'Complete Gaming PCs', 'Complete systems that avoid several separate upgrades.'),
    budgetDesktops,
    highEndDesktops,
    budgetLaptops,
    highEndLaptops,
  ],
  UNKNOWN_GPU: [
    section('gpu-options', 'GPU Options', 'Common graphics options when the current GPU cannot be identified.'),
    budgetDesktops,
    budgetLaptops,
  ],
  UNKNOWN_CPU: [
    section('cpu-options', 'CPU Options', 'Common processor options when the current CPU cannot be identified.'),
    budgetDesktops,
    budgetLaptops,
  ],
  UNKNOWN_RAM: [
    section('ram-options', 'RAM Options', 'Common memory options when installed RAM cannot be identified.'),
    budgetDesktops,
    budgetLaptops,
  ],
  UNKNOWN_STORAGE: [
    section('storage-options', 'Storage Upgrades', 'Common storage options when capacity cannot be identified.'),
    budgetDesktops,
    budgetLaptops,
  ],
  CANNOT_DETERMINE: [
    section(
      'popular-gaming-pcs',
      'Popular Gaming PCs',
      'Complete gaming PCs to consider when the current hardware cannot be resolved.',
      'grid',
      'PREBUILT',
    ),
    budgetDesktops,
    budgetLaptops,
  ],
};

export function getDefaultSectionId(scenarioCode: string, sectionKey: string) {
  return `section-${scenarioCode.toLowerCase().replaceAll('_', '-')}-${sectionKey}`;
}

function section(
  key: string,
  title: string,
  description: string,
  layout: RecommendationSectionLayout = 'grid',
  purpose: RecommendationSectionPurpose = 'GENERAL',
  maxProducts = 3,
  collapsedByDefault = false,
): DefaultRecommendationSection {
  return {
    key,
    title,
    description,
    layout,
    purpose,
    maxProducts,
    collapsedByDefault,
  };
}
