export const CORE_RECOMMENDATION_SCENARIOS = [
  {
    code: 'PASS_RECOMMENDED',
    displayName: 'Pass — Recommended',
    heading: 'Recommended Gaming Accessories',
    description: 'The PC meets the recommended requirements.',
    displayOrder: 10,
  },
  {
    code: 'PASS_MINIMUM',
    displayName: 'Pass — Minimum',
    heading: 'Upgrades for Better Performance',
    description: 'The PC meets minimum requirements but has room for improvement.',
    displayOrder: 20,
  },
  {
    code: 'FAIL_GPU',
    displayName: 'Fail — GPU',
    heading: 'GPU Upgrades You May Need',
    description: 'Only the GPU is below minimum.',
    displayOrder: 30,
  },
  {
    code: 'FAIL_CPU',
    displayName: 'Fail — CPU',
    heading: 'CPU Upgrades You May Need',
    description: 'Only the CPU is below minimum.',
    displayOrder: 40,
  },
  {
    code: 'FAIL_RAM',
    displayName: 'Fail — RAM',
    heading: 'RAM Upgrades You May Need',
    description: 'Only RAM is below minimum.',
    displayOrder: 50,
  },
  {
    code: 'FAIL_STORAGE',
    displayName: 'Fail — Storage',
    heading: 'Storage Upgrades You May Need',
    description: 'Only storage is below minimum.',
    displayOrder: 60,
  },
  {
    code: 'FAIL_CPU_GPU',
    displayName: 'Fail — CPU and GPU',
    heading: 'CPU and GPU Upgrades You May Need',
    description: 'The CPU and GPU are below minimum.',
    displayOrder: 70,
  },
  {
    code: 'FAIL_GPU_RAM',
    displayName: 'Fail — GPU and RAM',
    heading: 'GPU and RAM Upgrades You May Need',
    description: 'The GPU and RAM are below minimum.',
    displayOrder: 80,
  },
  {
    code: 'FAIL_CPU_RAM',
    displayName: 'Fail — CPU and RAM',
    heading: 'CPU and RAM Upgrades You May Need',
    description: 'The CPU and RAM are below minimum.',
    displayOrder: 90,
  },
  {
    code: 'FAIL_MULTIPLE',
    displayName: 'Fail — Multiple Components',
    heading: 'Recommended PC Upgrade Options',
    description: 'Three or more components, or another component combination, are below minimum.',
    displayOrder: 100,
  },
  {
    code: 'UNKNOWN_GPU',
    displayName: 'Unknown GPU',
    heading: 'Popular GPU Options',
    description: 'The GPU is unknown while the remaining result is usable.',
    displayOrder: 110,
  },
  {
    code: 'UNKNOWN_CPU',
    displayName: 'Unknown CPU',
    heading: 'Popular CPU Options',
    description: 'The CPU is unknown while the remaining result is usable.',
    displayOrder: 120,
  },
  {
    code: 'UNKNOWN_RAM',
    displayName: 'Unknown RAM',
    heading: 'Popular RAM Options',
    description: 'RAM is unknown while the remaining result is usable.',
    displayOrder: 130,
  },
  {
    code: 'UNKNOWN_STORAGE',
    displayName: 'Unknown Storage',
    heading: 'Popular Storage Options',
    description: 'Storage was not detected and no component is below minimum.',
    displayOrder: 140,
  },
  {
    code: 'CANNOT_DETERMINE',
    displayName: 'Cannot Determine',
    heading: 'Popular Gaming PC Options',
    description: 'CPU, GPU, or RAM is unresolved, so compatibility cannot be determined.',
    displayOrder: 150,
  },
] as const;

export type CoreRecommendationScenarioCode =
  (typeof CORE_RECOMMENDATION_SCENARIOS)[number]['code'];

const CORE_SCENARIO_CODE_SET = new Set<string>(
  CORE_RECOMMENDATION_SCENARIOS.map((scenario) => scenario.code),
);

export function isCoreRecommendationScenarioCode(
  value: string,
): value is CoreRecommendationScenarioCode {
  return CORE_SCENARIO_CODE_SET.has(value);
}
