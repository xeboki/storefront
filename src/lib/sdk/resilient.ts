/**
 * Stale-while-error read layer.
 *
 * The storefront reaches the catalog/store through one shared server-side API
 * key. A transient gateway hiccup (a 429 from the per-key quota, a 5xx) used to
 * throw straight through the loaders — `loadStore` returned null and the whole
 * store 404'd. That's the wrong failure mode for read-only shop data.
 *
 * resilientRead() keeps a durable last-known-good copy (Upstash REST when
 * configured, else per-instance memory) with a long stale TTL. On success it
 * refreshes the copy; on failure it serves the last good copy so the shop stays
 * up on cached data instead of going dark. Only when there is NO prior copy
 * (genuine cold miss while upstream is down) does it surface the miss.
 *
 * This sits INSIDE the ISR `unstable_cache` loaders: ISR is the hot path (few
 * upstream calls), this is the safety net for when a refresh fails.
 */
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const STALE_TTL_SEC = Number(process.env.STOREFRONT_STALE_TTL_SEC ?? '86400'); // 24h

interface MemEntry {
  value: string;
  expiresAt: number;
}
const _mem = new Map<string, MemEntry>();

async function staleGet(key: string): Promise<string | null> {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const res = await fetch(UPSTASH_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['GET', key]),
        cache: 'no-store',
      });
      if (!res.ok) return memGet(key);
      const out = (await res.json()) as { result: string | null };
      return out.result ?? memGet(key);
    } catch {
      return memGet(key);
    }
  }
  return memGet(key);
}

function memGet(key: string): string | null {
  const e = _mem.get(key);
  if (!e || Date.now() > e.expiresAt) return null;
  return e.value;
}

async function staleSet(key: string, value: string): Promise<void> {
  _mem.set(key, { value, expiresAt: Date.now() + STALE_TTL_SEC * 1000 });
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      await fetch(UPSTASH_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['SET', key, value, 'EX', String(STALE_TTL_SEC)]),
        cache: 'no-store',
      });
    } catch {
      /* memory copy still stands */
    }
  }
}

export interface ResilientOptions {
  /** What to return on a cold miss while upstream is down. Default: rethrow. */
  fallback?: 'null' | 'throw';
}

/**
 * Runs `fetcher`, caching its result as last-known-good. On failure, serves the
 * stale copy; if none exists, returns null (fallback:'null') or rethrows.
 */
export async function resilientRead<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  opts: ResilientOptions = {},
): Promise<T | null> {
  const key = `stale:${cacheKey}`;
  try {
    const value = await fetcher();
    // Only cache real data — never poison the stale copy with a null/empty.
    if (value !== null && value !== undefined) {
      await staleSet(key, JSON.stringify(value));
    }
    return value;
  } catch (err) {
    const cached = await staleGet(key);
    if (cached != null) {
      console.warn(`[resilient] serving stale "${cacheKey}" after upstream error`);
      return JSON.parse(cached) as T;
    }
    if (opts.fallback === 'null') return null;
    throw err;
  }
}
