import type {
  ProductRecord,
  ProductValueTier,
} from './affiliate-types';
import { isPublicHttpsUrl } from './affiliate-validation';
import { deriveCreatorCategories } from './recommendation-rule-engine';

export const CREATOR_BUDGET_OPTIONS = [
  { value: 'UNDER_100', label: 'Under $100' },
  { value: '100_250', label: '$100–$250' },
  { value: '250_500', label: '$250–$500' },
  { value: '500_1000', label: '$500–$1,000' },
  { value: '1000_PLUS', label: '$1,000+' },
] as const;

export const CREATOR_OWNED_GEAR_OPTIONS = [
  { value: 'GAMING_PC', label: 'Gaming PC' },
  { value: 'MICROPHONE', label: 'Microphone' },
  { value: 'WEBCAM', label: 'Webcam' },
  { value: 'HEADSET', label: 'Headset' },
  { value: 'SECOND_MONITOR', label: 'Second monitor' },
  { value: 'LIGHTING', label: 'Lighting' },
  { value: 'STREAM_CONTROLLER', label: 'Stream controller' },
  { value: 'NONE', label: 'None of these' },
] as const;

export const CREATOR_GOAL_OPTIONS = [
  { value: 'STREAM_GAMEPLAY', label: 'Stream gameplay' },
  { value: 'RECORD_YOUTUBE', label: 'Record YouTube videos' },
  { value: 'STREAM_RECORD', label: 'Stream and record' },
  { value: 'EDIT_VIDEO', label: 'Edit videos' },
  { value: 'IMPROVE_AUDIO', label: 'Improve audio quality' },
  { value: 'IMPROVE_CAMERA', label: 'Improve camera quality' },
] as const;

export const CREATOR_PRIORITY_OPTIONS = [
  { value: 'PC_PERFORMANCE', label: 'PC performance' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'CAMERA_LIGHTING', label: 'Camera and lighting' },
  { value: 'STREAM_CONTROLS', label: 'Stream controls' },
  { value: 'BALANCED', label: 'Complete balanced setup' },
] as const;

export type CreatorBudget = (typeof CREATOR_BUDGET_OPTIONS)[number]['value'];
export type CreatorOwnedGear = (typeof CREATOR_OWNED_GEAR_OPTIONS)[number]['value'];
export type CreatorGoal = (typeof CREATOR_GOAL_OPTIONS)[number]['value'];
export type CreatorPriority = (typeof CREATOR_PRIORITY_OPTIONS)[number]['value'];

export interface CreatorSetupAnswers {
  budget: CreatorBudget;
  ownedGear: CreatorOwnedGear[];
  goal: CreatorGoal;
  priority: CreatorPriority;
}

export interface CreatorSetupPlan {
  essentials: ProductRecord[];
  nextUpgrades: ProductRecord[];
  futureUpgrades: ProductRecord[];
  setupOrder: string[];
  summary: string;
}

type CreatorNeed =
  | 'PREBUILT'
  | 'PERFORMANCE'
  | 'MICROPHONE'
  | 'HEADSET'
  | 'CAMERA'
  | 'LIGHTING'
  | 'MONITOR'
  | 'STORAGE'
  | 'CONTROLS'
  | 'ACCESSORY';

interface ScoredProduct {
  product: ProductRecord;
  need: CreatorNeed;
  score: number;
}

const BUDGET_CONFIG: Record<
  CreatorBudget,
  {
    tiers: ProductValueTier[];
    maximum: number;
    essentials: number;
    next: number;
  }
> = {
  UNDER_100: {
    tiers: ['Minimum', 'Budget'],
    maximum: 3,
    essentials: 1,
    next: 1,
  },
  '100_250': {
    tiers: ['Minimum', 'Budget', 'Best Value'],
    maximum: 4,
    essentials: 2,
    next: 1,
  },
  '250_500': {
    tiers: ['Budget', 'Best Value', 'Recommended'],
    maximum: 6,
    essentials: 2,
    next: 2,
  },
  '500_1000': {
    tiers: ['Best Value', 'Recommended', 'Performance'],
    maximum: 8,
    essentials: 3,
    next: 3,
  },
  '1000_PLUS': {
    tiers: ['Best Value', 'Recommended', 'Performance', 'Premium'],
    maximum: 9,
    essentials: 3,
    next: 3,
  },
};

const GOAL_WEIGHTS: Record<CreatorGoal, Record<CreatorNeed, number>> = {
  STREAM_GAMEPLAY: {
    PREBUILT: 68,
    PERFORMANCE: 78,
    MICROPHONE: 100,
    HEADSET: 76,
    CAMERA: 88,
    LIGHTING: 82,
    MONITOR: 74,
    STORAGE: 66,
    CONTROLS: 72,
    ACCESSORY: 42,
  },
  RECORD_YOUTUBE: {
    PREBUILT: 66,
    PERFORMANCE: 84,
    MICROPHONE: 90,
    HEADSET: 58,
    CAMERA: 78,
    LIGHTING: 70,
    MONITOR: 62,
    STORAGE: 94,
    CONTROLS: 52,
    ACCESSORY: 48,
  },
  STREAM_RECORD: {
    PREBUILT: 72,
    PERFORMANCE: 90,
    MICROPHONE: 98,
    HEADSET: 72,
    CAMERA: 84,
    LIGHTING: 76,
    MONITOR: 78,
    STORAGE: 92,
    CONTROLS: 72,
    ACCESSORY: 48,
  },
  EDIT_VIDEO: {
    PREBUILT: 70,
    PERFORMANCE: 94,
    MICROPHONE: 56,
    HEADSET: 64,
    CAMERA: 58,
    LIGHTING: 44,
    MONITOR: 82,
    STORAGE: 100,
    CONTROLS: 40,
    ACCESSORY: 52,
  },
  IMPROVE_AUDIO: {
    PREBUILT: 52,
    PERFORMANCE: 66,
    MICROPHONE: 110,
    HEADSET: 96,
    CAMERA: 44,
    LIGHTING: 42,
    MONITOR: 50,
    STORAGE: 58,
    CONTROLS: 56,
    ACCESSORY: 38,
  },
  IMPROVE_CAMERA: {
    PREBUILT: 54,
    PERFORMANCE: 68,
    MICROPHONE: 62,
    HEADSET: 48,
    CAMERA: 110,
    LIGHTING: 104,
    MONITOR: 58,
    STORAGE: 64,
    CONTROLS: 56,
    ACCESSORY: 42,
  },
};

export function isCreatorSetupProduct(product: ProductRecord) {
  return Boolean(
    product.enabled &&
    isPublicHttpsUrl(product.affiliateUrl) &&
    product.valueTier &&
    creatorNeed(product),
  );
}

export function buildCreatorSetupPlan(
  products: readonly ProductRecord[],
  answers: CreatorSetupAnswers,
): CreatorSetupPlan {
  const config = BUDGET_CONFIG[answers.budget];
  const owned = new Set(answers.ownedGear);
  const candidates = products.flatMap((product): ScoredProduct[] => {
    const need = creatorNeed(product);
    if (
      !need ||
      !product.enabled ||
      !isPublicHttpsUrl(product.affiliateUrl) ||
      !product.valueTier ||
      !config.tiers.includes(product.valueTier) ||
      !fitsBudgetCategory(answers.budget, product.componentType) ||
      ownsNeed(owned, need)
    ) {
      return [];
    }

    const tierScore = Math.max(0, 36 - config.tiers.indexOf(product.valueTier) * 5);
    return [{
      product,
      need,
      score:
        GOAL_WEIGHTS[answers.goal][need] +
        priorityBoost(answers.priority, need) +
        tierScore +
        (product.imageUrl ? 4 : 0),
    }];
  });

  const ordered = diversifyByNeed(
    candidates.sort((left, right) =>
      right.score - left.score ||
      left.product.title.localeCompare(right.product.title),
    ),
  )
    .slice(0, config.maximum)
    .map((item) => item.product);
  const essentialCount = Math.min(config.essentials, ordered.length);
  const nextCount = Math.min(config.next, Math.max(0, ordered.length - essentialCount));

  return {
    essentials: ordered.slice(0, essentialCount),
    nextUpgrades: ordered.slice(essentialCount, essentialCount + nextCount),
    futureUpgrades: ordered.slice(essentialCount + nextCount),
    setupOrder: buildSetupOrder(owned, answers),
    summary: setupSummary(answers),
  };
}

function creatorNeed(product: Pick<ProductRecord, 'componentType' | 'title'>): CreatorNeed | null {
  if (product.componentType === 'Prebuilt Desktop' || product.componentType === 'Gaming Laptop') {
    return 'PREBUILT';
  }
  if (['CPU', 'GPU', 'RAM'].includes(product.componentType)) return 'PERFORMANCE';
  if (product.componentType === 'Storage') return 'STORAGE';
  if (product.componentType === 'Monitor') return 'MONITOR';
  if (product.componentType === 'Headset') return 'HEADSET';
  if (product.componentType === 'Controller') return 'CONTROLS';

  const categories = deriveCreatorCategories(product);
  if (categories.includes('AUDIO')) return 'MICROPHONE';
  if (categories.includes('CAMERA')) return 'CAMERA';
  if (categories.includes('LIGHTING')) return 'LIGHTING';
  if (categories.includes('STREAM_CONTROLLER')) return 'CONTROLS';
  if (
    categories.includes('CREATOR_ACCESSORY') &&
    /\b(?:capture card|ups|battery backup)\b/i.test(product.title)
  ) {
    return 'ACCESSORY';
  }
  return null;
}

function ownsNeed(owned: Set<CreatorOwnedGear>, need: CreatorNeed) {
  if (need === 'PREBUILT') return owned.has('GAMING_PC');
  if (need === 'MICROPHONE') return owned.has('MICROPHONE');
  if (need === 'HEADSET') return owned.has('HEADSET');
  if (need === 'CAMERA') return owned.has('WEBCAM');
  if (need === 'LIGHTING') return owned.has('LIGHTING');
  if (need === 'MONITOR') return owned.has('SECOND_MONITOR');
  if (need === 'CONTROLS') return owned.has('STREAM_CONTROLLER');
  return false;
}

function priorityBoost(priority: CreatorPriority, need: CreatorNeed) {
  if (priority === 'AUDIO' && (need === 'MICROPHONE' || need === 'HEADSET')) return 48;
  if (
    priority === 'CAMERA_LIGHTING' &&
    (need === 'CAMERA' || need === 'LIGHTING')
  ) {
    return 48;
  }
  if (
    priority === 'STREAM_CONTROLS' &&
    (need === 'CONTROLS' || need === 'MONITOR' || need === 'ACCESSORY')
  ) {
    return 48;
  }
  if (
    priority === 'PC_PERFORMANCE' &&
    (need === 'PERFORMANCE' || need === 'STORAGE' || need === 'PREBUILT')
  ) {
    return 48;
  }
  return priority === 'BALANCED' ? 8 : 0;
}

function fitsBudgetCategory(
  budget: CreatorBudget,
  componentType: ProductRecord['componentType'],
) {
  if (
    budget === 'UNDER_100' &&
    ['CPU', 'GPU', 'Monitor', 'Prebuilt Desktop', 'Gaming Laptop'].includes(componentType)
  ) {
    return false;
  }
  if (
    budget === '100_250' &&
    ['GPU', 'Prebuilt Desktop', 'Gaming Laptop'].includes(componentType)
  ) {
    return false;
  }
  if (
    budget === '250_500' &&
    ['Prebuilt Desktop', 'Gaming Laptop'].includes(componentType)
  ) {
    return false;
  }
  return true;
}

function diversifyByNeed(candidates: ScoredProduct[]) {
  const firstByNeed = new Set<CreatorNeed>();
  const firstPass: ScoredProduct[] = [];
  const repeats: ScoredProduct[] = [];

  for (const candidate of candidates) {
    if (firstByNeed.has(candidate.need)) {
      repeats.push(candidate);
    } else {
      firstByNeed.add(candidate.need);
      firstPass.push(candidate);
    }
  }
  return [...firstPass, ...repeats];
}

function buildSetupOrder(owned: Set<CreatorOwnedGear>, answers: CreatorSetupAnswers) {
  const steps: string[] = [];
  if (!owned.has('GAMING_PC') || answers.priority === 'PC_PERFORMANCE') {
    steps.push('Confirm the PC has enough gaming, OBS, and recording headroom.');
  }
  if (!owned.has('MICROPHONE')) {
    steps.push('Set up clear voice audio and test levels before going live.');
  }
  if (!owned.has('WEBCAM')) {
    steps.push('Add a camera only if face video supports your content format.');
  }
  if (!owned.has('LIGHTING')) {
    steps.push('Improve lighting before spending heavily on a more expensive camera.');
  }
  steps.push('Reserve fast storage space for recordings, clips, and project files.');
  if (!owned.has('SECOND_MONITOR')) {
    steps.push('Add workspace visibility for OBS, chat, and stream health when budget allows.');
  }
  if (!owned.has('STREAM_CONTROLLER')) {
    steps.push('Add stream controls last, after the core workflow is reliable.');
  }
  return steps.slice(0, 6);
}

function setupSummary(answers: CreatorSetupAnswers) {
  const goal = CREATOR_GOAL_OPTIONS.find((option) => option.value === answers.goal)?.label;
  const budget = CREATOR_BUDGET_OPTIONS.find((option) => option.value === answers.budget)?.label;
  return `A ${goal?.toLowerCase() ?? 'creator'} path using ${budget ?? 'your selected budget'} as a value-tier guide. Retail prices change, so confirm current pricing before buying.`;
}
