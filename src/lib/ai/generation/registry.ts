/**
 * AI Generation Engine — provider registry (Sprint 52).
 *
 * Pure in-memory catalog of provider METADATA. Deterministic insertion order;
 * duplicate ids rejected. Supports lookup, capability/asset-type filtering, and
 * metadata listing. No execution, no API calls. The default registry is seeded
 * with the built-in provider placeholders.
 */

import type { AssetType, GenerationProvider } from "./types";
import { BUILT_IN_PROVIDERS } from "./providers";

export class GenerationRegistry {
  private readonly providers = new Map<string, GenerationProvider>();

  register(provider: GenerationProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider already registered: ${provider.id}`);
    }
    this.providers.set(provider.id, provider);
  }

  get(id: string): GenerationProvider | undefined {
    return this.providers.get(id);
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  list(): GenerationProvider[] {
    return [...this.providers.values()];
  }

  /** Providers that support a given asset type. */
  listByAssetType(assetType: AssetType): GenerationProvider[] {
    return this.list().filter((p) => p.assetTypes.includes(assetType));
  }

  /** Providers whose capability supports image→video. */
  listImageToVideo(): GenerationProvider[] {
    return this.list().filter((p) => p.capability.supportsImageToVideo);
  }

  /** All distinct aspect ratios any provider supports. */
  supportedAspectRatios(): string[] {
    return [
      ...new Set(this.list().flatMap((p) => p.capability.aspectRatios)),
    ];
  }
}

/** Build a registry seeded with the built-in providers (deterministic order). */
export function createDefaultGenerationRegistry(): GenerationRegistry {
  const registry = new GenerationRegistry();
  for (const provider of BUILT_IN_PROVIDERS) registry.register(provider);
  return registry;
}
