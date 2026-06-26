/** Luma video adapter — normalization/validation/estimation only (Sprint 53). */
import { BaseGenerationAdapter } from "./base-adapter";
import { lumaProvider } from "../providers/luma";
import type { GenerationProvider } from "../types";

export class LumaAdapter extends BaseGenerationAdapter {
  readonly metadata: GenerationProvider = lumaProvider;
  protected readonly costWeight = 3.0;
}
