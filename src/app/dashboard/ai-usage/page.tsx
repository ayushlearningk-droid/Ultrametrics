/**
 * AI Usage — dashboard page (Sprint 11, Step 5).
 *
 * Owner/Admin-only Server Component. Renders workspace-wide Ask Ultrametrics
 * usage from the ai_usage read layer: 11 KPI cards + a recent-requests table.
 * Analytics only — not billing. No client component, no API route, no charts.
 */

import { requireWorkspaceRole } from "@/lib/api/require-workspace-role";
import {
  getUserWorkspaces,
  getCurrentWorkspaceId,
} from "@/lib/data/workspaces";
import { getAiUsageSummary, getRecentAiUsage } from "@/lib/data/ai-usage";
import { GlassCard } from "@/components/ui/glass-card";

export const metadata = { title: "AI Usage" };

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <GlassCard className="px-6 py-16 text-center">
        <h1 className="text-[15px] font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{body}</p>
      </GlassCard>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard glow className="flex flex-col gap-2 p-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </p>
      <p className="text-2xl font-bold tracking-tight text-foreground">
        {value}
      </p>
    </GlassCard>
  );
}

export default async function AiUsagePage() {
  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);
  if (!workspaceId) {
    return (
      <Notice
        title="No active workspace"
        body="Select or create a workspace to view AI usage."
      />
    );
  }

  const access = await requireWorkspaceRole(workspaceId, ["owner", "admin"]);
  if (!access.ok) {
    return (
      <Notice
        title="Owner/Admin only"
        body="AI usage is visible to workspace owners and admins."
      />
    );
  }

  const [summary, recent] = await Promise.all([
    getAiUsageSummary(workspaceId),
    getRecentAiUsage(workspaceId, 20),
  ]);

  const n = (v: number) => v.toLocaleString();

  const kpis: { label: string; value: string }[] = [
    { label: "Requests Today", value: n(summary.requestsToday) },
    { label: "Total Requests", value: n(summary.totalRequests) },
    { label: "Sonnet Requests", value: n(summary.sonnetRequests) },
    { label: "Opus Requests", value: n(summary.opusRequests) },
    { label: "Sonnet %", value: `${summary.sonnetPercent}%` },
    { label: "Opus %", value: `${summary.opusPercent}%` },
    { label: "Total Input Tokens", value: n(summary.totalInputTokens) },
    { label: "Total Output Tokens", value: n(summary.totalOutputTokens) },
    { label: "Avg Input Tokens", value: n(summary.avgInputTokens) },
    { label: "Avg Output Tokens", value: n(summary.avgOutputTokens) },
    { label: "Avg Tool Rounds", value: summary.avgToolRounds.toFixed(1) },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6">
      <header className="space-y-1">
        <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
          AI Usage
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Workspace-wide Ask Ultrametrics usage. Analytics only — not billing.
        </p>
      </header>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Kpi key={k.label} label={k.label} value={k.value} />
        ))}
      </div>

      {/* Recent Requests table */}
      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Recent Requests
        </h2>
        <GlassCard className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wide text-muted-foreground/70">
                <th className="px-4 py-2.5 font-semibold">Model</th>
                <th className="px-4 py-2.5 text-right font-semibold">
                  Input Tokens
                </th>
                <th className="px-4 py-2.5 text-right font-semibold">
                  Output Tokens
                </th>
                <th className="px-4 py-2.5 text-right font-semibold">
                  Tool Rounds
                </th>
                <th className="px-4 py-2.5 font-semibold">Stop Reason</th>
                <th className="px-4 py-2.5 font-semibold">Created At</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No requests yet
                  </td>
                </tr>
              ) : (
                recent.map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/[0.04] last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {r.model}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-foreground/85">
                      {r.input_tokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-foreground/85">
                      {r.output_tokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-foreground/85">
                      {r.tool_rounds.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {r.stop_reason ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </GlassCard>
      </section>
    </div>
  );
}
