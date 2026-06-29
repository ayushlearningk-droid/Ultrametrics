/**
 * Production Media Components — barrel (Sprint 63).
 *
 * Real, reusable media components that plug into the Unified Workspace. Render
 * actual media when given a source; honest empty-media frame otherwise.
 */

export type { PlatformId, MediaKind, MediaSource, MetricTone, PerformanceMetric } from "./types";
export { MediaFrame } from "./media-frame";
export { PlatformBadge } from "./platform-badge";
export { PerformanceBadge } from "./performance-badge";
export { CreativeThumbnail } from "./creative-thumbnail";
export { ImagePreviewCard } from "./image-preview-card";
export { VideoPreviewCard } from "./video-preview-card";
export { AdPoster } from "./ad-poster";
export { UGCCard } from "./ugc-card";
