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
