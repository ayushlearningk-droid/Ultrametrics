/** Recraft image adapter — normalization/validation/estimation only (Sprint 53). */
import { BaseGenerationAdapter } from "./base-adapter";
import { recraftProvider } from "../providers/recraft";
import type { GenerationProvider } from "../types";

export class RecraftAdapter extends BaseGenerationAdapter {
  readonly metadata: GenerationProvider = recraftProvider;
  protected readonly costWeight = 1.1;
}
