/**
 * AI Studio — Outcomes page (Sprint 63J · Outcome Engine).
 *
 * Outcome-first entry to the Studio — choose a result, the OS assembles the
 * plan. Deterministic, presentation only; no AI, no providers, no backend.
 */

import { AiOutcomeStudio } from "@/components/studio/outcomes/ai-outcome-studio";

export const metadata = { title: "Outcomes · AI Studio" };

export default function StudioOutcomesPage() {
  return <AiOutcomeStudio />;
}
