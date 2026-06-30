/**
 * AI Studio — Outcomes page (Sprint 63J · Outcome Engine).
 *
 * Outcome-first entry to the Studio — choose a result, the OS assembles the
 * plan. Deterministic, presentation only; no AI, no providers, no backend.
 */

import { ProductionPromptComposer } from "@/components/studio/composer/production-prompt-composer";

export const metadata = { title: "Outcomes · AI Studio" };

export default function StudioOutcomesPage() {
  return <ProductionPromptComposer />;
}
