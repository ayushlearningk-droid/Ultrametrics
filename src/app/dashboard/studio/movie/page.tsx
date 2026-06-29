/**
 * AI Studio — Movie page (Sprint 63I · AI Movie Runtime).
 *
 * The live AI Movie that replaces loading spinners — rendered inside the shell's
 * Workspace Region. Deterministic simulation over the AI Employees Runtime; no
 * AI, no providers, no backend.
 */

import { AiMovie } from "@/components/studio/movie/ai-movie";

export const metadata = { title: "AI Movie · AI Studio" };

export default function StudioMoviePage() {
  return <AiMovie />;
}
