/** Veo video adapter — normalization/validation/estimation only (Sprint 53). */
import { BaseGenerationAdapter } from "./base-adapter";
import { veoProvider } from "../providers/veo";
import type { GenerationProvider } from "../types";

export class VeoAdapter extends BaseGenerationAdapter {
  readonly metadata: GenerationProvider = veoProvider;
  protected readonly costWeight = 5.0;
}
