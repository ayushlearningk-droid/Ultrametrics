/**
 * Metrics cache (Phase 4).
 *
 * In-process, module-singleton cache for WorkspaceMetrics. Workspace-scoped and
 * query-scoped, 5-minute TTL, lazy expiry, size-capped. No database, no external
 * store — it relies only on Vercel warm-instance memory reuse, so it is a
 * BEST-EFFORT latency/cost reducer, NOT a consistency layer: each serverless
 * instance has its own Map, cold starts wipe it, and hit rate depends on request
 * affinity. Never rely on it for correctness.
 *
 * Security: keyed by workspaceId only. The engine gates with RBAC BEFORE calling
 * the cached facade (getMetrics) — the cache must never be read before that gate,
 * or it would serve another workspace's authorization decision. Keying excludes
 * user identity by design (metrics are workspace-scoped, not per-user).
 *
 * Kill switch: METRICS_CACHE_DISABLED. When the trimmed value equals "true",
 * the cache is bypassed entirely (every get is a miss, sets are no-ops).
 */

import type { MetricsQuery } from "@/lib/metrics/types";
import type { WorkspaceMetrics } from "@/lib/metrics/engine";

/** Time-to-live for a cached entry: 5 minutes. */
const TTL_MS = 5 * 60 * 1000;

/** Max distinct entries retained on a warm instance (oldest-evicted). */
const MAX_ENTRIES = 500;

interface CacheEntry {
  value: WorkspaceMetrics;
  expiresAt: number;
}

// Module-scoped singleton. Survives across invocations on a warm Vercel
// instance; reset on cold start / redeploy (which is also the rollback path).
const store = new Map<string, CacheEntry>();

/** True only when METRICS_CACHE_DISABLED is the literal trimmed string "true". */
export function isCacheDisabled(): boolean {
  return process.env.METRICS_CACHE_DISABLED?.trim().toLowerCase() === "true";
}

/**
 * Deterministic, order-independent cache key for a workspace + query. The query
 * is normalized (fixed field order) so logically identical queries collide on
 * the same key regardless of object construction order.
 */
export function cacheKey(workspaceId: string, query: MetricsQuery): string {
  const normalized = {
    since: query.dateRange.since,
    until: query.dateRange.until,
    granularity: query.granularity,
    level: query.level ?? null,
    // Mode must be part of the key: a "range" (180d) and a "lifetime" fetch can
    // share the same dateRange yet return different data — without this they'd
    // collide and serve the wrong window.
    mode: query.mode ?? "range",
  };
  return `${workspaceId}::${JSON.stringify(normalized)}`;
}

/**
 * Read a cached WorkspaceMetrics, or null on miss / expiry / disabled. Expired
 * entries are deleted lazily on access.
 */
export function getCached(
  workspaceId: string,
  query: MetricsQuery
): WorkspaceMetrics | null {
  if (isCacheDisabled()) return null;

  const key = cacheKey(workspaceId, query);
  const entry = store.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Store a WorkspaceMetrics with a 5-minute TTL. No-op when disabled. Evicts the
 * oldest entry when the size cap is reached to bound warm-instance memory.
 */
export function setCached(
  workspaceId: string,
  query: MetricsQuery,
  value: WorkspaceMetrics
): void {
  if (isCacheDisabled()) return;

  const key = cacheKey(workspaceId, query);

  // Bound memory: Map preserves insertion order, so the first key is oldest.
  if (!store.has(key) && store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }

  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

/**
 * Drop all cached entries for a workspace (e.g. after a connector change or
 * sync completes). Best-effort: only affects the current instance's Map.
 */
export function invalidate(workspaceId: string): void {
  const prefix = `${workspaceId}::`;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
