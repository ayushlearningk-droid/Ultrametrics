/**
 * AI Studio — Home page (Sprint 63A).
 *
 * Thin route that renders the AI Studio Home foundation inside the existing
 * dashboard layout (DashboardShell → sidebar · workspace context · auth). Reuse
 * only — no new layout, no data, no execution. Presentation foundation only.
 */

import { StudioEntry } from "@/components/studio/landing/studio-entry";

export const metadata = { title: "AI Studio" };

export default function AiStudioPage() {
  return <StudioEntry />;
}
