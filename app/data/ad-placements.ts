export const AD_PLACEMENT_CODES = [
  'homepage',
  'results',
  'article-top',
  'article-middle',
  'article-bottom',
  'article-sidebar',
  'footer',
] as const;

export type AdPlacementCode = (typeof AD_PLACEMENT_CODES)[number];

export interface AdPlacementDefinition {
  code: AdPlacementCode;
  displayName: string;
  description: string;
  defaultFormat: 'auto' | 'vertical';
  defaultDeviceTarget: 'both' | 'desktop';
  displayOrder: number;
}

export const DEFAULT_AD_PLACEMENTS: readonly AdPlacementDefinition[] = [
  {
    code: 'homepage',
    displayName: 'Homepage',
    description: 'Below the latest articles or feature-card section and above the email signup or footer.',
    defaultFormat: 'auto',
    defaultDeviceTarget: 'both',
    displayOrder: 10,
  },
  {
    code: 'results',
    displayName: 'Results',
    description: 'After the primary affiliate recommendation section and before secondary recommendations or email signup.',
    defaultFormat: 'auto',
    defaultDeviceTarget: 'both',
    displayOrder: 20,
  },
  {
    code: 'article-top',
    displayName: 'Article Top',
    description: 'After the article introduction or first few paragraphs.',
    defaultFormat: 'auto',
    defaultDeviceTarget: 'both',
    displayOrder: 30,
  },
  {
    code: 'article-middle',
    displayName: 'Article Middle',
    description: 'Approximately midway through the article body.',
    defaultFormat: 'auto',
    defaultDeviceTarget: 'both',
    displayOrder: 40,
  },
  {
    code: 'article-bottom',
    displayName: 'Article Bottom',
    description: 'Near the end of the article before related articles.',
    defaultFormat: 'auto',
    defaultDeviceTarget: 'both',
    displayOrder: 50,
  },
  {
    code: 'article-sidebar',
    displayName: 'Article Sidebar',
    description: 'Desktop-only article sidebar below useful sidebar content.',
    defaultFormat: 'vertical',
    defaultDeviceTarget: 'desktop',
    displayOrder: 60,
  },
  {
    code: 'footer',
    displayName: 'Footer',
    description: 'Above the site footer.',
    defaultFormat: 'auto',
    defaultDeviceTarget: 'both',
    displayOrder: 70,
  },
] as const;

export function isAdPlacementCode(value: string): value is AdPlacementCode {
  return (AD_PLACEMENT_CODES as readonly string[]).includes(value);
}

export function getAdPlacementDefinition(code: AdPlacementCode) {
  return DEFAULT_AD_PLACEMENTS.find((placement) => placement.code === code)!;
}
