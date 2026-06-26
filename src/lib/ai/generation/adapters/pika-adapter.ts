/** Pika video adapter — normalization/validation/estimation only (Sprint 53). */
import { BaseGenerationAdapter } from "./base-adapter";
import { pikaProvider } from "../providers/pika";
import type { GenerationProvider } from "../types";

export class PikaAdapter extends BaseGenerationAdapter {
  readonly metadata: GenerationProvider = pikaProvider;
  protected readonly costWeight = 3.0;
}
