/**
 * AI Generation Engine — adapter registry (Sprint 53).
 *
 * Pure in-memory catalog of adapter instances. Deterministic order; duplicate
 * ids rejected. Supports lookup, capability listing, and provider-compatibility
 * validation. No execution, no API calls.
 */

import type { BaseGenerationAdapter } from "./adapters/base-adapter";
import { BUILT_IN_ADAPTERS } from "./adapters";
import type {
  AssetType,
  GenerationRequest,
  ProviderCapability,
  ValidationResult,
} from "./types";

export class AdapterRegistry {
  private readonly adapters = new Map<string, BaseGenerationAdapter>();

  register(adapter: BaseGenerationAdapter): void {
    const id = adapter.metadata.id;
    if (this.adapters.has(id)) {
      throw new Error(`Adapter already registered: ${id}`);
    }
    this.adapters.set(id, adapter);
  }

  get(id: string): BaseGenerationAdapter | undefined {
    return this.adapters.get(id);
  }

  has(id: string): boolean {
    return this.adapters.has(id);
  }

  list(): BaseGenerationAdapter[] {
    return [...this.adapters.values()];
  }

  listByAssetType(assetType: AssetType): BaseGenerationAdapter[] {
    return this.list().filter((a) => a.metadata.assetTypes.includes(assetType));
  }

  /** Capability map keyed by adapter id. */
  listCapabilities(): Record<string, ProviderCapability> {
    const out: Record<string, ProviderCapability> = {};
    for (const a of this.list()) out[a.metadata.id] = a.capabilities();
    return out;
  }

  /** Validate a request against a specific adapter's provider compatibility. */
  validateProviderCompatibility(
    providerId: string,
    request: GenerationRequest
  ): ValidationResult {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      return { ok: false, errors: [`Unknown provider: ${providerId}`] };
    }
    return adapter.validate(request);
  }
}

/** Build a registry seeded with the built-in adapters (deterministic order). */
export function createDefaultAdapterRegistry(): AdapterRegistry {
  const registry = new AdapterRegistry();
  for (const adapter of BUILT_IN_ADAPTERS) registry.register(adapter);
  return registry;
}
