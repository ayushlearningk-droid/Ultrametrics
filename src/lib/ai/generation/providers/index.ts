/**
 * AI Generation Engine — provider placeholders barrel (Sprint 52).
 *
 * Deterministic ordered list of provider METADATA only. No adapters, no API
 * calls, no media generation. Real adapters implementing GenerationProviderAdapter
 * will arrive in a future sprint.
 */

import type { GenerationProvider } from "../types";
import { openaiProvider } from "./openai";
import { fluxProvider } from "./flux";
import { ideogramProvider } from "./ideogram";
import { recraftProvider } from "./recraft";
import { imagenProvider } from "./imagen";
import { runwayProvider } from "./runway";
import { veoProvider } from "./veo";
import { klingProvider } from "./kling";
import { pikaProvider } from "./pika";
import { lumaProvider } from "./luma";

export {
  openaiProvider,
  fluxProvider,
  ideogramProvider,
  recraftProvider,
  imagenProvider,
  runwayProvider,
  veoProvider,
  klingProvider,
  pikaProvider,
  lumaProvider,
};

/** All built-in provider metadata, in deterministic registration order. */
export const BUILT_IN_PROVIDERS: GenerationProvider[] = [
  openaiProvider,
  fluxProvider,
  ideogramProvider,
  recraftProvider,
  imagenProvider,
  runwayProvider,
  veoProvider,
  klingProvider,
  pikaProvider,
  lumaProvider,
];
