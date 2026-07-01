/**
 * Production Creative Browser — types + sample data + pure logic (Sprint 63).
 *
 * Reuses media + employees types. Deterministic sample creatives (no backend, no
 * fake analytics dashboards — only optional illustrative metric badges). Pure
 * filter/search/sort helpers.
 */

import type { MediaSource, PerformanceMetric, PlatformId } from "@/components/studio/media";
import type { EmployeeId } from "@/components/studio/employees/types";
import type { AssetExecution } from "@/components/studio/generation/execution";

export type CreativeStatusId = "generated" | "pending" | "approved" | "archived";
export type CreativeFilter =
  | "all"
  | "favorites"
  | "recent"
  | "archived"
  | "approved"
  | "pending"
  | "generated"
  | "collections";
export type CreativeSortId = "recent" | "name" | "version";
export type CreativeView = "grid" | "list";

export interface CreativeItem {
  id: string;
  title: string;
  media: MediaSource;
  platform: PlatformId;
  status: CreativeStatusId;
  ownerId: EmployeeId;
  version: number;
  variants: number;
  tags: string[];
  bookmarked: boolean;
  favorite: boolean;
  recent: boolean;
  /** Optional illustrative performance pills (none for most — no fake analytics). */
  metrics?: PerformanceMetric[];
  /** Drives the deterministic forecast chip. */
  budget: number;
  createdAt: number;
  /* ── Optional inspector metadata (additive; graceful "—" when absent) ── */
  brand?: string;
  audience?: string;
  campaign?: string;
  objective?: string;
  language?: string;
  /** Marketing DNA version that produced this asset (Sprint 63R). */
  dnaVersion?: string;
  /** Async execution state (Sprint 64.1) — present on generated creatives. */
  execution?: AssetExecution;
  history?: { at: number; text: string }[];
}

/**
 * No sample creatives (Sprint 64V). The studio shows ONLY real generated assets
 * from the Generation Store — never hardcoded "Aurora" campaigns. Generated
 * creatives are registered at runtime via registerCreatives().
 */
export const SAMPLE_CREATIVES: CreativeItem[] = [];

/* ── Generated-creative registry ─────────────────────────────────────────── */
/**
 * Generated campaigns (Sprint 63O) register their creatives here so the Queue,
 * Approval, and Inspector surfaces can resolve previews by id without importing
 * the generation runtime. Falls back to the sample set.
 */
const generatedRegistry = new Map<string, CreativeItem>();

export function registerCreatives(items: CreativeItem[]): void {
  for (const c of items) generatedRegistry.set(c.id, c);
}

/** Resolve a creative by id — generated first, then sample data. */
export function resolveCreative(id: string): CreativeItem | undefined {
  return generatedRegistry.get(id);
}

export interface CreativeCollection {
  id: string;
  label: string;
  count: number;
}

export const COLLECTIONS: CreativeCollection[] = [
  { id: "top", label: "Top performers", count: 3 },
  { id: "ugc", label: "UGC hooks", count: 4 },
  { id: "festive", label: "Festive", count: 2 },
];

/* ── Pure filter / search / sort ─────────────────────────────────────────── */
export function filterCreatives(items: CreativeItem[], filter: CreativeFilter): CreativeItem[] {
  switch (filter) {
    case "favorites":
      return items.filter((c) => c.favorite);
    case "recent":
      return items.filter((c) => c.recent);
    case "archived":
      return items.filter((c) => c.status === "archived");
    case "approved":
      return items.filter((c) => c.status === "approved");
    case "pending":
      return items.filter((c) => c.status === "pending");
    case "generated":
      return items.filter((c) => c.status === "generated");
    case "all":
    case "collections":
    default:
      return items;
  }
}

export function searchCreatives(items: CreativeItem[], q: string): CreativeItem[] {
  const s = q.trim().toLowerCase();
  if (!s) return items;
  return items.filter(
    (c) => c.title.toLowerCase().includes(s) || c.tags.some((t) => t.toLowerCase().includes(s))
  );
}

export function sortCreatives(items: CreativeItem[], sort: CreativeSortId): CreativeItem[] {
  const out = [...items];
  if (sort === "name") out.sort((a, b) => a.title.localeCompare(b.title));
  else if (sort === "version") out.sort((a, b) => b.version - a.version);
  else out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}
