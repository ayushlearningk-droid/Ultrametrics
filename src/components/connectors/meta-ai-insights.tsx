"use client";

import { useEffect, useState } from "react";
import { Lightbulb, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyRow {
  date_start: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
}

interface Rec {
  type: "opportunity" | "alert" | "info";
  icon: React.ElementType;
  title: string;
  body: string;
  metric?: string;
}

export function MetaAIInsights() {
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/meta/test-insights").then((r) => r.json()).catch(() => null),
      fetch("/api/meta/insights-daily").then((r) => r.json()).catch(() => null),
    ]).then(([totals, daily]) => {
      const built: Rec[] = [];
      const dailyRows: DailyRow[] = daily?.success ? (daily.days ?? []) : [];
      const sorted = [...dailyRows].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
      const recent = sorted.slice(-7);
      const prev = sorted.slice(-14, -7);

      if (totals?.success && totals.insights?.length) {
        const rows = totals.insights;
        const avgCtr = rows.reduce((s: number, r: Record<string, string>) => s + parseFloat(r.ctr ?? "0"), 0) / rows.length;
        const avgCpc = rows.reduce((s: number, r: Record<string, string>) => s + parseFloat(r.cpc ?? "0"), 0) / rows.length;

        if (avgCtr < 0.8) {
          built.push({
            type: "alert",
            icon: TrendingDown,
            title: "CTR below benchmark",
            body: `Your average CTR is ${avgCtr.toFixed(2)}%. Meta Ads typically perform best above 1.5%. Review ad creative and audience targeting to improve engagement.`,
            metric: `${avgCtr.toFixed(2)}% CTR`,
          });
        } else if (avgCtr > 2.5) {
          built.push({
            type: "opportunity",
            icon: TrendingUp,
            title: "Strong click-through rate",
            body: `Your CTR of ${avgCtr.toFixed(2)}% is above average. Consider increasing budget on top-performing ad sets to scale these results.`,
            metric: `${avgCtr.toFixed(2)}% CTR`,
          });
        }

        if (avgCpc > 2 && avgCtr < 1.5) {
          built.push({
            type: "alert",
            icon: Zap,
            title: "High cost per click",
            body: `At $${avgCpc.toFixed(2)} CPC with sub-average CTR, your campaigns may benefit from creative refresh or audience narrowing to improve cost efficiency.`,
            metric: `$${avgCpc.toFixed(2)} CPC`,
          });
        }
      }

      if (recent.length >= 5 && prev.length >= 5) {
        const recentSpend = recent.reduce((s, r) => s + parseFloat(r.spend), 0);
        const prevSpend = prev.reduce((s, r) => s + parseFloat(r.spend), 0);
        const recentCtr = recent.reduce((s, r) => s + parseFloat(r.ctr), 0) / recent.length;
        const prevCtr = prev.reduce((s, r) => s + parseFloat(r.ctr), 0) / prev.length;
        const spendPct = prevSpend ? ((recentSpend - prevSpend) / prevSpend) * 100 : 0;
        const ctrPct = prevCtr ? ((recentCtr - prevCtr) / prevCtr) * 100 : 0;

        if (spendPct > 15 && ctrPct < -10) {
          built.push({
            type: "alert",
            icon: TrendingDown,
            title: "Creative fatigue likely",
            body: `Spend increased ${spendPct.toFixed(0)}% week-over-week but CTR dropped ${Math.abs(ctrPct).toFixed(0)}%. This pattern typically indicates ad creative fatigue — consider introducing new visuals.`,
          });
        }

        if (recentSpend > 0) {
          const bestDay = recent.reduce((best, r) =>
            parseFloat(r.ctr) > parseFloat(best.ctr) ? r : best, recent[0]);
          built.push({
            type: "info",
            icon: Lightbulb,
            title: "Best day of the week",
            body: `Your highest CTR this week was on ${new Date(bestDay.date_start).toLocaleDateString("en-US", { weekday: "long" })} (${parseFloat(bestDay.ctr).toFixed(2)}%). Consider scheduling creative refreshes or budget boosts on high-performing days.`,
          });
        }
      }

      if (built.length === 0) {
        built.push({
          type: "info",
          icon: Lightbulb,
          title: "Not enough data yet",
          body: "AI insights require at least 14 days of campaign data. Keep your ads running and check back soon for personalized recommendations.",
        });
      }

      setRecs(built.slice(0, 4));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="max-w-xl space-y-3">
        <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">AI Insights</p>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  const STYLE = {
    opportunity: { border: "border-emerald-500/20", bg: "bg-emerald-500/[0.04]", bar: "bg-emerald-400", icon: "text-emerald-400" },
    alert: { border: "border-amber-500/20", bg: "bg-amber-500/[0.04]", bar: "bg-amber-400", icon: "text-amber-400" },
    info: { border: "border-brand/20", bg: "bg-brand/[0.04]", bar: "bg-brand", icon: "text-brand" },
  };

  return (
    <div className="max-w-xl space-y-3">
      <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">AI Insights</p>
      {(recs ?? []).map((r, i) => {
        const s = STYLE[r.type];
        const Icon = r.icon;
        return (
          <div key={i} className={cn("relative rounded-xl border p-5 pl-6", s.border, s.bg)}>
            <div className={cn("absolute left-0 top-4 bottom-4 w-[3px] rounded-r", s.bar)} />
            <div className="flex items-start gap-2.5">
              <Icon className={cn("mt-0.5 h-[14px] w-[14px] shrink-0", s.icon)} />
              <div>
                <p className="text-[13px] font-semibold text-foreground/90">{r.title}</p>
                {r.metric && (
                  <span className={cn("inline-block mt-1 rounded-full border px-2 py-0.5 font-mono text-[10px]", s.border, s.icon)}>
                    {r.metric}
                  </span>
                )}
              </div>
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-white/45">{r.body}</p>
          </div>
        );
      })}
    </div>
  );
}
