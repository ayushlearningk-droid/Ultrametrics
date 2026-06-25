/**
 * Dashboard (Executive home) — loading state (Sprint 20).
 *
 * Next route-level loading UI shown while the brief is composed server-side.
 * Token skeletons mirror the MorningBrief composition (hero → KPI → focus grid).
 */

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-8">
      {/* Hero */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-44 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-8 w-72 animate-pulse rounded bg-white/[0.06]" />
        </div>
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card h-20 animate-pulse" />
          ))}
        </div>
      </div>

      <div className="h-px bg-white/[0.06]" />

      {/* Focus grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card h-44 animate-pulse" />
        <div className="card h-44 animate-pulse" />
      </div>

      {/* Full-width sections */}
      <div className="card h-36 animate-pulse" />
      <div className="card h-36 animate-pulse" />
    </div>
  );
}
