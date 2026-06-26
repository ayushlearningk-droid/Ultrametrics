/**
 * AI Generation Engine — shared types (Sprint 52, architecture only).
 *
 * The provider-agnostic contracts every future image/video provider plugs into.
 * Pure data + types — NO execution, NO API calls, NO media is produced here.
 * Results carry no fabricated assets; they are the shape real providers will
 * later fill. No I/O.
 */

export type AssetType = "image" | "video";

export type AspectRatio =
  | "1:1"
  | "16:9"
  | "9:16"
  | "4:5"
  | "3:4"
  | "21:9";

export type GenerationStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/** Whether a provider is wired for live calls. Always "disabled" this sprint. */
export type GenerationExecutionMode = "disabled" | "live";

/** Lifecycle of a provider integration. */
export type ProviderStatus = "planned" | "beta" | "available";

/** What a provider can do — declared capability metadata (not a guarantee). */
export interface ProviderCapability {
  assetTypes: AssetType[];
  aspectRatios: AspectRatio[];
  /** Max clip length for video providers (seconds). Omitted for image-only. */
  maxDurationSec?: number;
  /** Max assets per request. */
  maxBatch: number;
  supportsNegativePrompt: boolean;
  supportsSeed: boolean;
  supportsImageToVideo: boolean;
}

/** Serializable provider metadata held by the registry. */
export interface GenerationProvider {
  id: string;
  name: string;
  vendor: string;
  description: string;
  assetTypes: AssetType[];
  capability: ProviderCapability;
  status: ProviderStatus;
  executionMode: GenerationExecutionMode;
}

/** A request to generate media. */
export interface GenerationRequest {
  providerId: string;
  assetType: AssetType;
  prompt: string;
  aspectRatio: AspectRatio;
  /** Video only — requested clip length (seconds). */
  durationSec?: number;
  negativePrompt?: string;
  seed?: number;
  batch?: number;
}

/** A produced asset descriptor. `url` stays null until a real provider runs. */
export interface GeneratedAsset {
  type: AssetType;
  url: string | null;
  width: number | null;
  height: number | null;
}

/** The outcome of a generation job. */
export interface GenerationResult {
  jobId: string;
  providerId: string;
  status: GenerationStatus;
  assets: GeneratedAsset[];
  error?: string;
}

/** A queued/tracked generation job. */
export interface GenerationJob {
  id: string;
  request: GenerationRequest;
  status: GenerationStatus;
  createdAtIndex: number;
  result?: GenerationResult;
  error?: string;
}

/** Result of validating a request against a provider's capability. */
export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/** Result of a provider health probe (future). */
export interface ProviderHealth {
  ok: boolean;
  detail: string;
}
