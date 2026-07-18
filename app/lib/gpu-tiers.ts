import type {
  HardwareFormFactor,
  HardwareTierEntry,
  HardwareVendor,
} from './hardware-ranking-types';
import {
  getMinimumRequirements,
  getRecommendedRequirements,
} from '../data/gta6-requirements';

// Laptop and integrated parts have their own entries instead of inheriting desktop tiers.
const minimumRequirements = getMinimumRequirements();
const recommendedRequirements = getRecommendedRequirements();
function gpu(
  canonicalName: string,
  vendor: HardwareVendor,
  formFactor: HardwareFormFactor,
  performanceTier: number,
  aliases: readonly string[] = [],
): HardwareTierEntry {
  const shortName = canonicalName
    .replace(/^NVIDIA GeForce\s+/i, '')
    .replace(/^AMD Radeon\s+/i, '')
    .replace(/^Intel\s+/i, '');

  return {
    canonicalName,
    vendor,
    formFactor,
    performanceTier,
    aliases: [shortName, ...aliases],
  };
}

export const GPU_PERFORMANCE_TIERS: readonly HardwareTierEntry[] = [
  // NVIDIA desktop GTX 10 and GTX 16 series.
  gpu('NVIDIA GeForce GTX 1050', 'nvidia', 'desktop', 130),
  gpu('NVIDIA GeForce GTX 1050 Ti', 'nvidia', 'desktop', 160),
  gpu('NVIDIA GeForce GTX 1060', 'nvidia', 'desktop', 220),
  gpu('NVIDIA GeForce GTX 1070', 'nvidia', 'desktop', 280),
  gpu('NVIDIA GeForce GTX 1070 Ti', 'nvidia', 'desktop', 310),
  gpu('NVIDIA GeForce GTX 1080', 'nvidia', 'desktop', 350),
  gpu('NVIDIA GeForce GTX 1080 Ti', 'nvidia', 'desktop', 410),
  gpu('NVIDIA GeForce GTX 1630', 'nvidia', 'desktop', 150),
  gpu('NVIDIA GeForce GTX 1650', 'nvidia', 'desktop', 220),
  gpu('NVIDIA GeForce GTX 1650 Super', 'nvidia', 'desktop', 260),
  gpu(minimumRequirements.gpu.nvidia, 'nvidia', 'desktop', 300),
  gpu('NVIDIA GeForce GTX 1660 Super', 'nvidia', 'desktop', 320),
  gpu('NVIDIA GeForce GTX 1660 Ti', 'nvidia', 'desktop', 330),

  // NVIDIA desktop RTX 20, 30, 40, and 50 series.
  gpu('NVIDIA GeForce RTX 2060', 'nvidia', 'desktop', 340),
  gpu('NVIDIA GeForce RTX 2060 Super', 'nvidia', 'desktop', 370),
  gpu('NVIDIA GeForce RTX 2070', 'nvidia', 'desktop', 400),
  gpu('NVIDIA GeForce RTX 2070 Super', 'nvidia', 'desktop', 430),
  gpu('NVIDIA GeForce RTX 2080', 'nvidia', 'desktop', 460),
  gpu('NVIDIA GeForce RTX 2080 Super', 'nvidia', 'desktop', 480),
  gpu('NVIDIA GeForce RTX 2080 Ti', 'nvidia', 'desktop', 520),
  gpu('NVIDIA GeForce RTX 3050', 'nvidia', 'desktop', 320),
  gpu('NVIDIA GeForce RTX 3060', 'nvidia', 'desktop', 420),
  gpu('NVIDIA GeForce RTX 3060 Ti', 'nvidia', 'desktop', 470),
  gpu(recommendedRequirements.gpu.nvidia, 'nvidia', 'desktop', 500),
  gpu('NVIDIA GeForce RTX 3070 Ti', 'nvidia', 'desktop', 540),
  gpu('NVIDIA GeForce RTX 3080', 'nvidia', 'desktop', 600),
  gpu('NVIDIA GeForce RTX 3080 Ti', 'nvidia', 'desktop', 640),
  gpu('NVIDIA GeForce RTX 3090', 'nvidia', 'desktop', 660),
  gpu('NVIDIA GeForce RTX 3090 Ti', 'nvidia', 'desktop', 680),
  gpu('NVIDIA GeForce RTX 4060', 'nvidia', 'desktop', 460),
  gpu('NVIDIA GeForce RTX 4060 Ti', 'nvidia', 'desktop', 520),
  gpu('NVIDIA GeForce RTX 4070', 'nvidia', 'desktop', 610),
  gpu('NVIDIA GeForce RTX 4070 Super', 'nvidia', 'desktop', 650),
  gpu('NVIDIA GeForce RTX 4070 Ti', 'nvidia', 'desktop', 680),
  gpu('NVIDIA GeForce RTX 4070 Ti Super', 'nvidia', 'desktop', 710),
  gpu('NVIDIA GeForce RTX 4080', 'nvidia', 'desktop', 760),
  gpu('NVIDIA GeForce RTX 4080 Super', 'nvidia', 'desktop', 780),
  gpu('NVIDIA GeForce RTX 4090', 'nvidia', 'desktop', 860),
  gpu('NVIDIA GeForce RTX 5050', 'nvidia', 'desktop', 430),
  gpu('NVIDIA GeForce RTX 5060', 'nvidia', 'desktop', 540),
  gpu('NVIDIA GeForce RTX 5060 Ti', 'nvidia', 'desktop', 610),
  gpu('NVIDIA GeForce RTX 5070', 'nvidia', 'desktop', 690),
  gpu('NVIDIA GeForce RTX 5070 Ti', 'nvidia', 'desktop', 760),
  gpu('NVIDIA GeForce RTX 5080', 'nvidia', 'desktop', 840),
  gpu('NVIDIA GeForce RTX 5090', 'nvidia', 'desktop', 940),

  // NVIDIA laptop variants. Explicit laptop/mobile aliases prevent desktop equivalence.
  gpu('NVIDIA GeForce GTX 1050 Laptop GPU', 'nvidia', 'laptop', 110, ['GTX 1050 Mobile']),
  gpu('NVIDIA GeForce GTX 1050 Ti Laptop GPU', 'nvidia', 'laptop', 140, [
    'GTX 1050 Ti Mobile',
  ]),
  gpu('NVIDIA GeForce GTX 1060 Laptop GPU', 'nvidia', 'laptop', 200, ['GTX 1060 Mobile']),
  gpu('NVIDIA GeForce GTX 1070 Laptop GPU', 'nvidia', 'laptop', 260, ['GTX 1070 Mobile']),
  gpu('NVIDIA GeForce GTX 1080 Laptop GPU', 'nvidia', 'laptop', 320, ['GTX 1080 Mobile']),
  gpu('NVIDIA GeForce GTX 1650 Laptop GPU', 'nvidia', 'laptop', 190, ['GTX 1650 Mobile']),
  gpu('NVIDIA GeForce GTX 1660 Ti Laptop GPU', 'nvidia', 'laptop', 290, [
    'GTX 1660 Ti Mobile',
  ]),
  gpu('NVIDIA GeForce RTX 2060 Laptop GPU', 'nvidia', 'laptop', 310, [
    'RTX 2060 Mobile',
    'RTX 2060 Max-Q',
  ]),
  gpu('NVIDIA GeForce RTX 2070 Laptop GPU', 'nvidia', 'laptop', 350, [
    'RTX 2070 Mobile',
    'RTX 2070 Max-Q',
  ]),
  gpu('NVIDIA GeForce RTX 2080 Laptop GPU', 'nvidia', 'laptop', 400, [
    'RTX 2080 Mobile',
    'RTX 2080 Max-Q',
  ]),
  gpu('NVIDIA GeForce RTX 3050 Laptop GPU', 'nvidia', 'laptop', 270, ['RTX 3050 Mobile']),
  gpu('NVIDIA GeForce RTX 3050 Ti Laptop GPU', 'nvidia', 'laptop', 290, [
    'RTX 3050 Ti Mobile',
  ]),
  gpu('NVIDIA GeForce RTX 3060 Laptop GPU', 'nvidia', 'laptop', 370, ['RTX 3060 Mobile']),
  gpu('NVIDIA GeForce RTX 3070 Laptop GPU', 'nvidia', 'laptop', 440, [
    'RTX 3070 Mobile',
    'RTX 3070 Max-Q',
  ]),
  gpu('NVIDIA GeForce RTX 3070 Ti Laptop GPU', 'nvidia', 'laptop', 470, [
    'RTX 3070 Ti Mobile',
  ]),
  gpu('NVIDIA GeForce RTX 3080 Laptop GPU', 'nvidia', 'laptop', 500, ['RTX 3080 Mobile']),
  gpu('NVIDIA GeForce RTX 3080 Ti Laptop GPU', 'nvidia', 'laptop', 530, [
    'RTX 3080 Ti Mobile',
  ]),
  gpu('NVIDIA GeForce RTX 4050 Laptop GPU', 'nvidia', 'laptop', 350, ['RTX 4050 Mobile']),
  gpu('NVIDIA GeForce RTX 4060 Laptop GPU', 'nvidia', 'laptop', 430, ['RTX 4060 Mobile']),
  gpu('NVIDIA GeForce RTX 4070 Laptop GPU', 'nvidia', 'laptop', 490, ['RTX 4070 Mobile']),
  gpu('NVIDIA GeForce RTX 4080 Laptop GPU', 'nvidia', 'laptop', 610, ['RTX 4080 Mobile']),
  gpu('NVIDIA GeForce RTX 4090 Laptop GPU', 'nvidia', 'laptop', 680, ['RTX 4090 Mobile']),
  gpu('NVIDIA GeForce RTX 5050 Laptop GPU', 'nvidia', 'laptop', 390, ['RTX 5050 Mobile']),
  gpu('NVIDIA GeForce RTX 5060 Laptop GPU', 'nvidia', 'laptop', 470, ['RTX 5060 Mobile']),
  gpu('NVIDIA GeForce RTX 5070 Laptop GPU', 'nvidia', 'laptop', 540, ['RTX 5070 Mobile']),
  gpu('NVIDIA GeForce RTX 5070 Ti Laptop GPU', 'nvidia', 'laptop', 600, [
    'RTX 5070 Ti Mobile',
  ]),
  gpu('NVIDIA GeForce RTX 5080 Laptop GPU', 'nvidia', 'laptop', 690, ['RTX 5080 Mobile']),
  gpu('NVIDIA GeForce RTX 5090 Laptop GPU', 'nvidia', 'laptop', 760, ['RTX 5090 Mobile']),

  // AMD desktop RX 5000, 6000, 7000, and 9000 series.
  gpu('AMD Radeon RX 5500 XT', 'amd', 'desktop', 220),
  gpu(minimumRequirements.gpu.amd, 'amd', 'desktop', 300),
  gpu('AMD Radeon RX 5700', 'amd', 'desktop', 350),
  gpu('AMD Radeon RX 5700 XT', 'amd', 'desktop', 390),
  gpu('AMD Radeon RX 6400', 'amd', 'desktop', 180),
  gpu('AMD Radeon RX 6500 XT', 'amd', 'desktop', 230),
  gpu('AMD Radeon RX 6600', 'amd', 'desktop', 360),
  gpu('AMD Radeon RX 6600 XT', 'amd', 'desktop', 410),
  gpu('AMD Radeon RX 6650 XT', 'amd', 'desktop', 430),
  gpu('AMD Radeon RX 6700', 'amd', 'desktop', 460),
  gpu(recommendedRequirements.gpu.amd, 'amd', 'desktop', 500),
  gpu('AMD Radeon RX 6750 XT', 'amd', 'desktop', 530),
  gpu('AMD Radeon RX 6800', 'amd', 'desktop', 590),
  gpu('AMD Radeon RX 6800 XT', 'amd', 'desktop', 640),
  gpu('AMD Radeon RX 6900 XT', 'amd', 'desktop', 680),
  gpu('AMD Radeon RX 6950 XT', 'amd', 'desktop', 710),
  gpu('AMD Radeon RX 7600', 'amd', 'desktop', 390),
  gpu('AMD Radeon RX 7600 XT', 'amd', 'desktop', 430),
  gpu('AMD Radeon RX 7700 XT', 'amd', 'desktop', 560),
  gpu('AMD Radeon RX 7800 XT', 'amd', 'desktop', 630),
  gpu('AMD Radeon RX 7900 GRE', 'amd', 'desktop', 680),
  gpu('AMD Radeon RX 7900 XT', 'amd', 'desktop', 740),
  gpu('AMD Radeon RX 7900 XTX', 'amd', 'desktop', 790),
  gpu('AMD Radeon RX 9060 XT', 'amd', 'desktop', 560),
  gpu('AMD Radeon RX 9070', 'amd', 'desktop', 700),
  gpu('AMD Radeon RX 9070 XT', 'amd', 'desktop', 760),

  // AMD mobile discrete GPUs use their mobile suffixes and independent tiers.
  gpu('AMD Radeon RX 5500M', 'amd', 'laptop', 190),
  gpu('AMD Radeon RX 5600M', 'amd', 'laptop', 280),
  gpu('AMD Radeon RX 6500M', 'amd', 'laptop', 210),
  gpu('AMD Radeon RX 6600M', 'amd', 'laptop', 340),
  gpu('AMD Radeon RX 6650M XT', 'amd', 'laptop', 390),
  gpu('AMD Radeon RX 6700M', 'amd', 'laptop', 400),
  gpu('AMD Radeon RX 6800M', 'amd', 'laptop', 470),
  gpu('AMD Radeon RX 6850M XT', 'amd', 'laptop', 500),
  gpu('AMD Radeon RX 7600S', 'amd', 'laptop', 350),
  gpu('AMD Radeon RX 7600M XT', 'amd', 'laptop', 390),
  gpu('AMD Radeon RX 7700S', 'amd', 'laptop', 420),

  // Integrated GPUs are intentionally conservative and never inherit a discrete tier.
  gpu('AMD Radeon 660M Graphics', 'amd', 'integrated', 100, ['Radeon 660M']),
  gpu('AMD Radeon 680M Graphics', 'amd', 'integrated', 130, ['Radeon 680M']),
  gpu('AMD Radeon 740M Graphics', 'amd', 'integrated', 90, ['Radeon 740M']),
  gpu('AMD Radeon 760M Graphics', 'amd', 'integrated', 120, ['Radeon 760M']),
  gpu('AMD Radeon 780M Graphics', 'amd', 'integrated', 160, ['Radeon 780M']),
  gpu('AMD Radeon 880M Graphics', 'amd', 'integrated', 180, ['Radeon 880M']),
  gpu('AMD Radeon 890M Graphics', 'amd', 'integrated', 210, ['Radeon 890M']),
  gpu('Intel UHD Graphics 620', 'intel', 'integrated', 40, ['UHD 620']),
  gpu('Intel UHD Graphics 630', 'intel', 'integrated', 50, ['UHD 630']),
  gpu('Intel UHD Graphics 730', 'intel', 'integrated', 60, ['UHD 730']),
  gpu('Intel UHD Graphics 770', 'intel', 'integrated', 70, ['UHD 770']),
  gpu('Intel Iris Xe Graphics', 'intel', 'integrated', 90, ['Iris Xe']),
  gpu('Intel Arc Graphics', 'intel', 'integrated', 130, ['Intel Arc Integrated Graphics']),
  gpu('Intel Arc 130V Graphics', 'intel', 'integrated', 150, ['Arc 130V']),
  gpu('Intel Arc 140V Graphics', 'intel', 'integrated', 190, ['Arc 140V']),

  // Common Intel Arc discrete gaming cards.
  gpu('Intel Arc A380', 'intel', 'desktop', 210, ['Arc A380']),
  gpu('Intel Arc A580', 'intel', 'desktop', 330, ['Arc A580']),
  gpu('Intel Arc A750', 'intel', 'desktop', 380, ['Arc A750']),
  gpu('Intel Arc A770', 'intel', 'desktop', 410, ['Arc A770']),
  gpu('Intel Arc B570', 'intel', 'desktop', 390, ['Arc B570']),
  gpu('Intel Arc B580', 'intel', 'desktop', 450, ['Arc B580']),
];
