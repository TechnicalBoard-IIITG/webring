interface CacheEntry {
  expiresAt: number;
  promise: Promise<unknown>;
}

// Small in-process cache. It keeps the leaderboard from hammering the
// upstream APIs on every request and dedupes concurrent identical lookups.
const MAX_ENTRIES = 500;
const store = new Map<string, CacheEntry>();

interface CacheOptions<T> {
  /** Override the TTL based on the resolved value (e.g. retry failures sooner). */
  ttlFor?: (value: T) => number;
}

export function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
  options: CacheOptions<T> = {},
): Promise<T> {
  const now = Date.now();
  const existing = store.get(key);

  if (existing && existing.expiresAt > now) {
    return existing.promise as Promise<T>;
  }

  if (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;

    if (oldestKey !== undefined) store.delete(oldestKey);
  }

  const entry: CacheEntry = { expiresAt: now + ttlMs, promise: load() };
  store.set(key, entry);

  entry.promise
    .then((value) => {
      if (store.get(key) === entry && options.ttlFor) {
        entry.expiresAt = Date.now() + options.ttlFor(value as T);
      }
    })
    .catch(() => {
      // Failed lookups should not be served for the full TTL.
      if (store.get(key) === entry) store.delete(key);
    });

  return entry.promise as Promise<T>;
}
