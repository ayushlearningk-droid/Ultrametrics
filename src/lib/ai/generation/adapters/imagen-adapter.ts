/** Imagen image adapter — normalization/validation/estimation only (Sprint 53). */
import { BaseGenerationAdapter } from "./base-adapter";
import { imagenProvider } from "../providers/imagen";
import type { GenerationProvider } from "../types";

export class ImagenAdapter extends BaseGenerationAdapter {
  readonly metadata: GenerationProvider = imagenProvider;
  protected readonly costWeight = 1.3;
}
