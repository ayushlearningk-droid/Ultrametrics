/**
 * Reports — stub (Sprint 4 Phase C).
 *
 * Placeholder so the Sidebar V7 "Reports" item resolves. The saved-reports
 * library is a later sprint.
 */

import { FileText } from "lucide-react";

export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-6 py-16 text-center">
        <FileText className="mb-3 h-6 w-6 text-foreground-muted" />
        <h1 className="text-[15px] font-semibold text-foreground">Reports</h1>
        <p className="mt-1 max-w-sm text-[13px] text-foreground-muted">
          Saved analyses, opportunities, and root-cause investigations will live
          here. Coming soon.
        </p>
      </div>
    </div>
  );
}
