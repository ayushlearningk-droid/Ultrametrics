/**
 * AI Studio — nested shell layout (Sprint 63I).
 *
 * Mounts the AI Studio Operating System shell around ONLY the /dashboard/studio
 * subtree. It nests inside the existing dashboard layout, so it reuses the
 * already-mounted AskProvider, EnvironmentLayer (L0), sidebar, command palette,
 * and auth/workspace context — no duplicate providers or chrome.
 *
 * The shell hosts page content in its center workspace region. Constitution-
 * aligned: additive, non-destructive; existing routes are untouched.
 */

import { AiStudioShell } from "@/components/studio/shell/ai-studio-shell";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1680px] px-3 py-4 md:px-6 md:py-6">
      <AiStudioShell>{children}</AiStudioShell>
    </div>
  );
}
