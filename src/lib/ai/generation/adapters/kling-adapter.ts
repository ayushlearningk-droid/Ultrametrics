/** Kling video adapter — normalization/validation/estimation only (Sprint 53). */
import { BaseGenerationAdapter } from "./base-adapter";
import { klingProvider } from "../providers/kling";
import type { GenerationProvider } from "../types";

export class KlingAdapter extends BaseGenerationAdapter {
  readonly metadata: GenerationProvider = klingProvider;
  protected readonly costWeight = 4.0;
}
