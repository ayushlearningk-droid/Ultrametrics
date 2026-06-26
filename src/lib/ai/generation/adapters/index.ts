/**
 * AI Generation Engine — adapters barrel (Sprint 53).
 *
 * Deterministic ordered list of pure adapter instances. Each provides
 * normalization/validation/estimation only — no execution, no API calls.
 */

import { BaseGenerationAdapter } from "./base-adapter";
import { OpenAIAdapter } from "./openai-adapter";
import { FluxAdapter } from "./flux-adapter";
import { IdeogramAdapter } from "./ideogram-adapter";
import { RecraftAdapter } from "./recraft-adapter";
import { ImagenAdapter } from "./imagen-adapter";
import { RunwayAdapter } from "./runway-adapter";
import { VeoAdapter } from "./veo-adapter";
import { KlingAdapter } from "./kling-adapter";
import { PikaAdapter } from "./pika-adapter";
import { LumaAdapter } from "./luma-adapter";

export { BaseGenerationAdapter, type CapabilityFlag, type RawProviderOutcome } from "./base-adapter";
export {
  OpenAIAdapter,
  FluxAdapter,
  IdeogramAdapter,
  RecraftAdapter,
  ImagenAdapter,
  RunwayAdapter,
  VeoAdapter,
  KlingAdapter,
  PikaAdapter,
  LumaAdapter,
};

/** All built-in adapters, in deterministic registration order. */
export const BUILT_IN_ADAPTERS: BaseGenerationAdapter[] = [
  new OpenAIAdapter(),
  new FluxAdapter(),
  new IdeogramAdapter(),
  new RecraftAdapter(),
  new ImagenAdapter(),
  new RunwayAdapter(),
  new VeoAdapter(),
  new KlingAdapter(),
  new PikaAdapter(),
  new LumaAdapter(),
];
