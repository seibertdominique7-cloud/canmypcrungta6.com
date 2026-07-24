import 'server-only';

const ENTRY_TTL_MS = 10 * 60 * 1000;

interface IdempotencyEntry<T> {
  createdAt: number;
  promise: Promise<T>;
}

const globalForAiSeo = globalThis as typeof globalThis & {
  aiSeoIdempotencyEntries?: Map<string, IdempotencyEntry<unknown>>;
};

const entries =
  globalForAiSeo.aiSeoIdempotencyEntries ??
  new Map<string, IdempotencyEntry<unknown>>();

if (process.env.NODE_ENV !== 'production') {
  globalForAiSeo.aiSeoIdempotencyEntries = entries;
}

export async function runAiSeoIdempotent<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  prune();
  const existing = entries.get(key) as IdempotencyEntry<T> | undefined;
  if (existing) return existing.promise;

  const promise = operation().catch((error) => {
    entries.delete(key);
    throw error;
  });
  entries.set(key, { createdAt: Date.now(), promise });
  return promise;
}

function prune() {
  const cutoff = Date.now() - ENTRY_TTL_MS;
  for (const [key, entry] of entries) {
    if (entry.createdAt < cutoff) entries.delete(key);
  }
}
