/**
 * Provider health (Sprint 57 — Observability). READ-ONLY, CONFIG-PRESENCE ONLY.
 *
 * Reports whether each provider is CONFIGURED (required env vars present) — it
 * never calls Meta, Google Ads, OpenAI, Claude, or Gemini. No execution, no
 * token reads, no network. Rate-limit profiles (56E) are surfaced for context
 * where one exists.
 */

import { RATE_LIMIT_PROFILES, type RateLimitProfile } from "@/lib/queue";

export type ProviderKey =
  | "meta"
  | "google_ads"
  | "openai"
  | "claude"
  | "gemini";

export interface ProviderHealth {
  provider: ProviderKey;
  configured: boolean;
  /** Required env var names + whether each is present (never the values). */
  requiredEnv: Array<{ name: string; present: boolean }>;
  /** Rate-limit profile when the provider has one (transport-pacing only). */
  rateLimit: RateLimitProfile | null;
}

const REQUIRED_ENV: Record<ProviderKey, string[]> = {
  meta: ["META_APP_ID", "META_APP_SECRET"],
  google_ads: [
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_ADS_MCC_CUSTOMER_ID",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ],
  // OpenAI/Gemini are pure adapters today (no live keys wired) — reported as
  // configured only if conventional keys are present.
  openai: ["OPENAI_API_KEY"],
  claude: ["ANTHROPIC_API_KEY"],
  gemini: ["GEMINI_API_KEY"],
};

// Accept common alternates without executing anything.
const ENV_ALTERNATES: Record<string, string[]> = {
  GEMINI_API_KEY: ["GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_AI_API_KEY"],
};

function envPresent(name: string): boolean {
  const candidates = [name, ...(ENV_ALTERNATES[name] ?? [])];
  return candidates.some((n) => {
    const v = process.env[n];
    return typeof v === "string" && v.trim() !== "";
  });
}

const PROVIDER_RATE_PROFILE: Partial<Record<ProviderKey, RateLimitProfile>> = {
  meta: RATE_LIMIT_PROFILES.meta,
  google_ads: RATE_LIMIT_PROFILES.google_ads,
};

function healthFor(provider: ProviderKey): ProviderHealth {
  const requiredEnv = REQUIRED_ENV[provider].map((name) => ({
    name,
    present: envPresent(name),
  }));
  return {
    provider,
    configured: requiredEnv.every((e) => e.present),
    requiredEnv,
    rateLimit: PROVIDER_RATE_PROFILE[provider] ?? null,
  };
}

export interface ProviderHealthReport {
  collectedAt: string;
  providers: ProviderHealth[];
}

/** Config-presence health for all providers. No provider is executed. */
export function getProviderHealth(): ProviderHealthReport {
  const providers: ProviderKey[] = [
    "meta",
    "google_ads",
    "openai",
    "claude",
    "gemini",
  ];
  return {
    collectedAt: new Date().toISOString(),
    providers: providers.map(healthFor),
  };
}
