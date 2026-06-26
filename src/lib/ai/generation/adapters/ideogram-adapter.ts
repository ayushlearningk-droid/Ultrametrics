/** Ideogram image adapter — normalization/validation/estimation only (Sprint 53). */
import { BaseGenerationAdapter } from "./base-adapter";
import { ideogramProvider } from "../providers/ideogram";
import type { GenerationProvider } from "../types";

export class IdeogramAdapter extends BaseGenerationAdapter {
  readonly metadata: GenerationProvider = ideogramProvider;
  protected readonly costWeight = 1.0;
}
