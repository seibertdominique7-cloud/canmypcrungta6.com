import { CPU_PERFORMANCE_TIERS } from './cpu-tiers';
import { GPU_PERFORMANCE_TIERS } from './gpu-tiers';
import type { HardwareTierEntry } from './hardware-ranking-types';

export interface HardwareTierMatch {
  entry: HardwareTierEntry;
  matchedAlias: string;
}

interface IndexedAlias {
  entry: HardwareTierEntry;
  alias: string;
  normalizedAlias: string;
}

const CPU_ALIASES = indexCatalog(CPU_PERFORMANCE_TIERS);
const GPU_ALIASES = indexCatalog(GPU_PERFORMANCE_TIERS);

export function normalizeHardwareName(value: string) {
  return value
    .replace(/[®™©]/g, '')
    .normalize('NFKD')
    .replace(/([a-z])(?=\d)/gi, '$1 ')
    .replace(/(\d)(?=[a-z])/gi, '$1 ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function resolveCpuModel(value: string): HardwareTierMatch | null {
  return resolveFromCatalog(value, CPU_ALIASES);
}

export function resolveGpuModel(value: string): HardwareTierMatch | null {
  const normalized = normalizeHardwareName(value);
  const laptopName = /\b(laptop|mobile|notebook)\b|\bmax\s*q\b/.test(normalized);

  return resolveFromCatalog(value, GPU_ALIASES, (entry) => {
    if (laptopName) {
      return entry.formFactor === 'laptop';
    }

    return true;
  });
}

function indexCatalog(catalog: readonly HardwareTierEntry[]) {
  return catalog
    .flatMap((entry) =>
      [entry.canonicalName, ...entry.aliases].map((alias) => ({
        entry,
        alias,
        normalizedAlias: normalizeHardwareName(alias),
      })),
    )
    .filter((candidate) => candidate.normalizedAlias.length > 0)
    .sort((left, right) => right.normalizedAlias.length - left.normalizedAlias.length);
}

function resolveFromCatalog(
  value: string,
  aliases: readonly IndexedAlias[],
  allowEntry: (entry: HardwareTierEntry) => boolean = () => true,
): HardwareTierMatch | null {
  const normalized = normalizeHardwareName(value);

  if (!normalized) {
    return null;
  }

  const searchable = ` ${normalized} `;
  const match = aliases.find(
    (candidate) =>
      allowEntry(candidate.entry) && searchable.includes(` ${candidate.normalizedAlias} `),
  );

  if (!match) {
    return null;
  }

  return {
    entry: match.entry,
    matchedAlias: match.alias,
  };
}
