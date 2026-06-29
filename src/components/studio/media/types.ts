/**
 * Production Media Components — shared types (Sprint 63).
 *
 * Real, reusable presentation contracts. Components render actual media when a
 * source is provided and an honest empty-media frame otherwise (never a fake
 * gradient pretending to be content). No business logic, no backend.
 */

export type PlatformId = "tiktok" | "reels" | "shorts" | "meta" | "youtube";

export type MediaKind = "image" | "video";

export interface MediaSource {
  kind: MediaKind;
  /** Real media URL. When absent, an honest empty-media frame is shown. */
  src?: string;
  /** Poster frame for videos. */
  poster?: string;
  alt?: string;
}

export type MetricTone = "positive" | "neutral" | "negative";

export interface PerformanceMetric {
  label: string;
  value: string;
  tone?: MetricTone;
}
