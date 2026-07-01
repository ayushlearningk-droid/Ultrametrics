/**
 * Live Provider Routing (Sprint 64P).
 *
 * A provider-agnostic routing layer that selects among providers that are
 * actually executable, then reuses the existing orchestrator ranking. It filters
 * out providers that are not enabled / not live / not capability-compatible
 * before ranking, so disabled providers (e.g. a planned video model) are never
 * chosen ahead of a live one. Nothing is hardcoded in the routing logic — which
 * providers are live is DATA (LIVE_PROVIDERS config), extended as providers go
 * live. The registry metadata is untouched.
 *
 * NOTE: actual API-key presence is enforced server-side in the execution route
 * (missing key → structured error). The client filter uses the live config; a
 * provider marked live here is one with a wired, enabled execution path.
 */

import type { AdapterRegistry } from "./adapter-registry";
import type { BaseGenerationAdapter } from "./adapters/base-adapter";
import type { GenerationRequest } from "./types";
import { rankProviders } from "./orchestrator";

/** Per-provider live-execution descriptor (config, not routing logic). */
export interface LiveProviderDescriptor {
  /** Operator-enabled for execution. */
  enabled: boolean;
  /** A wired, live execution path exists (executionMode = live). */
  live: boolean;
  /** Health/quality preference — higher wins before ranking. */
  priority: number;
}

/**
 * Providers with a wired, enabled live execution path. Add an entry to make a
 * provider live — routing stays provider-agnostic.
 */
export const LIVE_PROVIDERS: Record<string, LiveProviderDescriptor> = {
  openai: { enabled: true, live: true, priority: 10 },
};

export function liveDescriptor(providerId: string): LiveProviderDescriptor {
  return LIVE_PROVIDERS[providerId] ?? { enabled: false, live: false, priority: 0 };
}

/** The six live-routing attributes every provider exposes (derived, not stored). */
export interface LiveCapability {
  providerId: string;
  executionMode: "live" | "disabled";
  enabled: boolean;
  live: boolean;
  priority: number;
  supportsImage: boolean;
  supportsVideo: boolean;
}

export function liveCapabilityOf(adapter: BaseGenerationAdapter): LiveCapability {
  const d = liveDescriptor(adapter.metadata.id);
  const types = adapter.metadata.assetTypes;
  return {
    providerId: adapter.metadata.id,
    executionMode: d.live ? "live" : "disabled",
    enabled: d.enabled,
    live: d.live,
    priority: d.priority,
    supportsImage: types.includes("image"),
    supportsVideo: types.includes("video"),
  };
}

export interface LiveSelection {
  ok: boolean;
  providerId: string | null;
  request: GenerationRequest;
  reason: string;
  errorCode?: "no_live_provider_available";
}

export interface LiveRoutingOptions {
  preferredProviderId?: string;
}

/**
 * Select a live, capability-compatible provider for a request. Filters first
 * (executable + live + enabled + supports asset type & aspect ratio), then uses
 * the existing orchestrator ranking. Returns a structured
 * `no_live_provider_available` error when nothing is live.
 */
export function selectLiveProvider(
  registry: AdapterRegistry,
  request: GenerationRequest,
  options: LiveRoutingOptions = {}
): LiveSelection {
  // 1) Capability-compatible candidates (asset type + aspect ratio).
  const compatible = registry.list().filter((a) => {
    const cap = a.capabilities();
    return cap.assetTypes.includes(request.assetType) && cap.aspectRatios.includes(request.aspectRatio);
  });

  // 2) Keep only executable, live, enabled providers.
  const live = compatible.filter((a) => {
    const d = liveDescriptor(a.metadata.id);
    return d.enabled && d.live;
  });

  if (live.length === 0) {
    return {
      ok: false,
      providerId: null,
      request,
      reason: `No live provider available for ${request.assetType} · ${request.aspectRatio}.`,
      errorCode: "no_live_provider_available",
    };
  }

  // 3) Existing ranking, restricted to the live survivors (used only after filtering).
  const ranked = rankProviders(registry, request, "balanced").filter((c) =>
    live.some((a) => a.metadata.id === c.providerId)
  );

  // 4) Honor a compatible preference; otherwise prefer priority (health), then ranking.
  let chosenId: string | undefined;
  if (options.preferredProviderId && live.some((a) => a.metadata.id === options.preferredProviderId)) {
    chosenId = options.preferredProviderId;
  } else {
    chosenId = [...live].sort((a, b) => {
      const pa = liveDescriptor(a.metadata.id).priority;
      const pb = liveDescriptor(b.metadata.id).priority;
      if (pb !== pa) return pb - pa;
      const ra = ranked.findIndex((c) => c.providerId === a.metadata.id);
      const rb = ranked.findIndex((c) => c.providerId === b.metadata.id);
      return ra - rb;
    })[0]?.metadata.id;
  }

  if (!chosenId) {
    return { ok: false, providerId: null, request, reason: "No live provider available.", errorCode: "no_live_provider_available" };
  }

  const adapter = registry.get(chosenId)!;
  return { ok: true, providerId: chosenId, request: adapter.normalizeRequest(request), reason: `Selected live provider "${chosenId}".` };
}
