/**
 * AI Studio — Team page (Sprint 63H · AI Employees Runtime).
 *
 * Renders the live AI Employees center inside the shell's Workspace Region.
 * Deterministic simulation — no AI, no providers, no backend.
 */

import { AiEmployeesCenter } from "@/components/studio/employees/ai-employees-center";

export const metadata = { title: "AI Team · AI Studio" };

export default function StudioTeamPage() {
  return <AiEmployeesCenter />;
}
