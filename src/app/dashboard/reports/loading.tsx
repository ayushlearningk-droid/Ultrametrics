/**
 * AI Reports Engine — loading state (Sprint 18).
 *
 * Next route-level loading UI shown while the server composes the report.
 * Token skeletons mirror the ReportView document layout.
 */

export default function ReportsLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:px-6">
      <div className="space-y-2 border-b border-white/[0.08] pb-6">
        <div className="h-3 w-40 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-7 w-64 animate-pulse rounded bg-white/[0.06]" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
          <div className="card h-28 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
