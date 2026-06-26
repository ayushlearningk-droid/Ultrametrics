/** Flux image adapter — normalization/validation/estimation only (Sprint 53). */
import { BaseGenerationAdapter } from "./base-adapter";
import { fluxProvider } from "../providers/flux";
import type { GenerationProvider } from "../types";

export class FluxAdapter extends BaseGenerationAdapter {
  readonly metadata: GenerationProvider = fluxProvider;
  protected readonly costWeight = 1.0;
}
