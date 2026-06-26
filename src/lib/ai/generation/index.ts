/**
 * AI Generation Engine (Sprint 52) — single entry point.
 *
 * The provider-agnostic foundation every future image/video provider plugs
 * into: types, the provider interface, the metadata registry, and a pure
 * deterministic queue. Architecture only — no execution, no API calls, no
 * media generation.
 */

export * from "./types";
export {
  type GenerationProviderAdapter,
  validateAgainstCapability,
} from "./provider";
export {
  GenerationRegistry,
  createDefaultGenerationRegistry,
} from "./registry";
export {
  GenerationQueue,
  canTransition,
  type TransitionResult,
} from "./queue";
export { BUILT_IN_PROVIDERS } from "./providers";

// Sprint 53 — adapter layer (pure normalization/validation/estimation).
export {
  estimateImageCredits,
  estimateVideoCredits,
  estimateExpectedDuration,
  type CostEstimate,
  type DurationEstimate,
} from "./cost-estimator";
export {
  validatePromptText,
  validateAspectRatioFor,
  validateProviderCompatibility,
  validateRequest,
} from "./validation";
export {
  BaseGenerationAdapter,
  BUILT_IN_ADAPTERS,
  type CapabilityFlag,
  type RawProviderOutcome,
} from "./adapters";
export {
  AdapterRegistry,
  createDefaultAdapterRegistry,
} from "./adapter-registry";

// Sprint 54 — pure orchestration layer (selection / routing / queue planning).
export {
  rankProviders,
  selectProvider,
  planBatch,
  planQueue,
  materializePlan,
  type RoutingStrategy,
  type OrchestratorOptions,
  type ProviderCandidate,
  type SelectionResult,
  type PlannedJob,
  type OrchestrationPlan,
} from "./orchestrator";
