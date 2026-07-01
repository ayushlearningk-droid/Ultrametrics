/**
 * Creative Prompt Composer (Sprint 64T) — pure, provider-agnostic.
 *
 * Turns the collected workspace data (brand · objective · products · audience ·
 * Marketing DNA · brand assets · reference images) plus the per-creative angle
 * into a full, photorealistic marketing prompt + a negative prompt. Replaces the
 * old "prompt = creative.title" (which made models render the title as
 * typography). Every field is optional and skipped gracefully when absent.
 *
 * Provider-agnostic by design: the negative directives are stated in BOTH the
 * main prompt (natural language — for models like gpt-image-1 that have no
 * negative-prompt field) AND the `negativePrompt` string (for models that do,
 * e.g. Flux · Ideogram · Recraft · Fal · Replicate). No provider-specific logic.
 */

import type { AspectRatio, AssetType } from "./types";
import type { GenerationInput } from "@/components/studio/generation/schemas";
import type { CreativeItem } from "@/components/studio/creative/creative-data";
import type { PlatformId } from "@/components/studio/media";

const PLATFORM_LABEL: Record<PlatformId, string> = {
  reels: "Instagram Reels",
  tiktok: "TikTok",
  shorts: "YouTube Shorts",
  meta: "Instagram / Facebook Feed",
  youtube: "YouTube",
};

export interface PromptContext {
  input: GenerationInput;
  creative: CreativeItem;
  assetType: AssetType;
  aspectRatio: AspectRatio;
}

export interface ComposedPrompt {
  prompt: string;
  negativePrompt: string;
}

const clean = (v: string | undefined | null): string | undefined => {
  const t = v?.trim();
  return t ? t : undefined;
};

/** `Label:\nvalue` section, or null when the value is empty (skipped gracefully). */
function section(label: string, value: string | undefined | null): string | null {
  const v = clean(value ?? undefined);
  return v ? `${label}:\n${v}` : null;
}

/** Compose the final prompt + negative prompt from workspace data. Pure. */
export function composePrompt(ctx: PromptContext): ComposedPrompt {
  const { input, creative, assetType, aspectRatio } = ctx;
  const dna = input.dna;
  const memory = input.memory;

  const brand = clean(input.brand) ?? clean(dna?.brandName);
  const objective = clean(input.objective) ?? clean(creative.objective);
  const platformLabel = PLATFORM_LABEL[creative.platform] ?? creative.platform;
  const products = (input.product ?? []).map((p) => p.trim()).filter(Boolean);
  const style = clean(dna?.visualStyle) ?? clean(memory?.campaignStyle);
  const voice = clean(dna?.voice) ?? clean(memory?.tone);
  const audience = clean(input.audience) ?? clean(creative.audience);
  const concept = clean(creative.title);
  const usp = clean(dna?.usp);
  const positioning = clean(dna?.pricePositioning);
  const restrictions = (dna?.restrictions ?? []).map((r) => r.trim()).filter(Boolean);

  const refs = input.referenceImages ?? [];
  const brandAssets = input.brandAssets ?? [];
  const logo = brandAssets.find((a) => /logo/i.test(a.kind) || /logo/i.test(a.label));
  const brandAssetLabels = brandAssets.map((a) => a.label).filter(Boolean);

  const isVideo = assetType === "video";
  const lead = isVideo
    ? "Create an ultra realistic, premium marketing advertisement video scene."
    : "Create an ultra realistic, premium marketing advertisement image.";

  const objectiveLine = objective ? `${objective} for ${platformLabel}.` : `Marketing campaign for ${platformLabel}.`;

  const sections: (string | null)[] = [
    lead,
    section("Brand", brand),
    section("Objective", objectiveLine),
    section("Products", products.length ? products.join("\n") : undefined),
    // The strategic angle informs the SCENE — it must never be drawn as text.
    concept ? `Creative concept:\n${concept}\n(Express this visually through the scene — do NOT render these words as text.)` : null,
    section("Visual style", style),
    section("Brand voice", voice),
    section("Target audience", audience),
    section("Positioning", [positioning, usp].filter(Boolean).join(" · ") || undefined),
    // Premium photographic direction (defaults — provider-agnostic, brand-neutral).
    section("Lighting", "Premium cinematic lighting, soft key light, warm highlights, gentle natural reflections."),
    section(
      "Composition",
      "Hero product arrangement with shallow depth of field and tasteful negative space; clean, modern, on-brand environment."
    ),
    section("Background", "Modern, uncluttered, contextually relevant setting with subtle brand-appropriate cues."),
    section("Camera & quality", "Photorealistic, 8K, 35mm DSLR, ultra-detailed, commercial advertising quality."),
    refs.length ? `Reference material:\nUse the ${refs.length} provided reference image(s) to match product identity, styling and palette.` : null,
    brandAssetLabels.length ? `Brand assets:\nStay on-brand with: ${brandAssetLabels.join(", ")}.` : null,
    logo ? "Brand logo:\nA brand logo asset is available — reserve clean, uncrowded space for logo placement; do not distort, recolor, or invent a logo." : null,
    restrictions.length ? `Brand restrictions:\n${restrictions.map((r) => `- ${r}`).join("\n")}` : null,
    // Negative directives in natural language (for models without a negative field).
    "Constraints:\n- Do not render any text, letters, words, numbers, captions, or typography.\n- Do not add logos or brand marks unless explicitly provided.\n- Do not add a watermark or signature.\n- Leave the upper 20% of the frame as clean, empty negative space reserved for marketing copy.",
    `Aspect ratio: ${aspectRatio}.`,
  ];

  const prompt = sections.filter((s): s is string => Boolean(s)).join("\n\n");

  const negativePrompt = [
    "text",
    "words",
    "letters",
    "numbers",
    "typography",
    "captions",
    "labels",
    "watermark",
    "signature",
    "unrequested logos",
    "gibberish text",
    "distorted",
    "deformed",
    "low quality",
    "blurry",
    "jpeg artifacts",
    "extra limbs",
    ...restrictions,
  ].join(", ");

  return { prompt, negativePrompt };
}
