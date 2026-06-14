import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40" />
      <div className="container relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="brand" className="mb-6 px-4 py-1">
            Marketing data platform · Now in public beta
          </Badge>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Unify every marketing channel into{" "}
            <span className="bg-gradient-to-r from-brand to-blue-400 bg-clip-text text-transparent">
              one metrics layer
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Connect ad platforms, analytics, and e‑commerce. Automate syncs,
            monitor jobs, and ship client-ready reports — without spreadsheet chaos.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button variant="brand" size="lg" asChild className="h-12 px-8 text-base">
              <Link href="/signup">
                Start 14-day free trial
                <ArrowRight className="ml-1" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="h-12 px-8 text-base">
              <Link href="#features">
                <Play className="mr-1 h-4 w-4" />
                See how it works
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required · Setup in under 5 minutes
          </p>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="rounded-2xl border bg-card/50 p-2 shadow-2xl shadow-brand/10 backdrop-blur-sm">
            <div className="overflow-hidden rounded-xl border bg-background">
              <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-400/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                </div>
                <span className="mx-auto text-xs text-muted-foreground">
                  dashboard.ultrametrics.io
                </span>
              </div>
              <div className="grid gap-4 p-6 md:grid-cols-3">
                {[
                  { label: "Active connectors", value: "12", change: "+3 this week" },
                  { label: "Sync success rate", value: "99.2%", change: "Last 30 days" },
                  { label: "Records synced", value: "2.4M", change: "Today" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border bg-card p-4 transition-colors hover:border-brand/30"
                  >
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                    <p className="mt-1 text-xs text-brand">{stat.change}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
