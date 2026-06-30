/**
 * AI Studio Command Center — tool option data (Sprint 63).
 *
 * Option lists for the command-center tool selectors (model · voice · knowledge
 * · skills · connectors · workspace memory). Presentation data only; the brand /
 * outcome reuse the Prompt Composer. No backend.
 */

export interface ToolOption {
  id: string;
  label: string;
}

export const MODEL_OPTIONS: ToolOption[] = [
  { id: "auto", label: "Auto" },
  { id: "opus", label: "Opus 4.8" },
  { id: "sonnet", label: "Sonnet 4.6" },
];

export const VOICE_OPTIONS: ToolOption[] = [
  { id: "none", label: "No voice" },
  { id: "maya", label: "Maya · warm" },
  { id: "leo", label: "Leo · bold" },
  { id: "nova", label: "Nova · clear" },
];

export const KNOWLEDGE_OPTIONS: ToolOption[] = [
  { id: "brand-guide", label: "Brand guidelines" },
  { id: "product-catalog", label: "Product catalog" },
  { id: "faq", label: "FAQ" },
];

export const SKILL_OPTIONS: ToolOption[] = [
  { id: "hook-writer", label: "Hook writer" },
  { id: "ad-optimizer", label: "Ad optimizer" },
  { id: "storyboarder", label: "Storyboarder" },
];

export const CONNECTOR_OPTIONS: ToolOption[] = [
  { id: "meta", label: "Meta Ads" },
  { id: "google", label: "Google Ads" },
  { id: "tiktok", label: "TikTok" },
];

export const MEMORY_OPTIONS: ToolOption[] = [
  { id: "target-roas", label: "Target ROAS 3.0" },
  { id: "voice-bold", label: "Brand voice: bold" },
  { id: "audience", label: "Core: lapsed buyers" },
];
