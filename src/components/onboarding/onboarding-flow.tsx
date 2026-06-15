"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { BRAND_ICON_MAP, GenericPlatformIcon } from "@/components/ui/brand-icons";
import { cn } from "@/lib/utils";

interface ConnectorOption {
  id: string;
  name: string;
  description: string;
  href: string;
  connected: boolean;
  needsAttention: boolean;
}

interface OnboardingFlowProps {
  userName: string;
  workspaceName: string;
  connectors: ConnectorOption[];
}

const STEPS = ["Welcome", "Connect", "Ready"] as const;

export function OnboardingFlow({
  userName,
  workspaceName,
  connectors,
}: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const connectedCount = connectors.filter((c) => c.connected).length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-0 text-foreground">
      {/* ── L0 environment ─────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 0%, hsl(240 20% 6%) 0%, hsl(240 18% 4%) 45%, hsl(240 22% 2.5%) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(55% 50% at 16% 6%, hsl(var(--amb-blue) / 0.14) 0%, transparent 60%), radial-gradient(55% 55% at 88% 96%, hsl(var(--amb-violet) / 0.12) 0%, transparent 58%)",
        }}
      />

      <div className="relative z-[1] flex min-h-screen flex-col items-center px-5 py-8 sm:px-6">
        {/* progress indicator */}
        <div className="flex w-full max-w-md items-center justify-center gap-2.5 py-4">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border type-caption font-medium transition-all duration-300",
                    i < step
                      ? "border-brand/50 bg-brand/[0.12] text-brand"
                      : i === step
                      ? "border-brand bg-brand text-surface-0"
                      : "border-white/[0.12] text-foreground-muted/50"
                  )}
                >
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden type-caption font-medium sm:inline",
                    i === step ? "text-foreground/85" : "text-foreground-muted/50"
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span className="h-px w-6 bg-white/[0.1]" />
              )}
            </div>
          ))}
        </div>

        {/* floating onboarding card (L3) */}
        <div className="flex flex-1 items-center justify-center w-full">
          <div
            key={step}
            className="surface-elevated relative w-full max-w-lg overflow-hidden anim-settle shadow-[0_28px_80px_-12px_hsl(240_40%_1%/0.7)]"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

            {/* ── STEP 1 · Welcome ─────────────────────────────────── */}
            {step === 0 && (
              <div className="px-7 py-9 sm:px-9 sm:py-11">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                    <span className="anim-pulse absolute inline-flex h-2.5 w-2.5 rounded-full bg-brand/40" />
                    <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-brand shadow-[0_0_8px_2px] shadow-brand/50" />
                  </span>
                  <span className="type-eyebrow text-foreground-muted">
                    Setup · Step 1 of 3
                  </span>
                </div>
                <h1 className="mt-5 type-display text-balance">
                  Welcome to Ultrametrics{userName ? `, ${userName}` : ""}.
                </h1>
                <p className="mt-3 type-body text-foreground-muted">
                  Your AI marketing operating system is ready. We&apos;ll connect
                  your first source and put your campaigns under continuous watch.
                </p>

                <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/[0.04]">
                  <div className="bg-surface-1/70 px-5 py-4">
                    <p className="type-caption text-foreground-muted/60">Workspace</p>
                    <p className="mt-1 truncate type-body font-medium text-foreground/88">
                      {workspaceName}
                    </p>
                  </div>
                  <div className="bg-surface-1/70 px-5 py-4">
                    <p className="type-caption text-foreground-muted/60">Signed in as</p>
                    <p className="mt-1 truncate type-body font-medium text-foreground/88">
                      {userName || "You"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setStep(1)}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 type-body font-medium text-surface-0 transition-all hover:bg-brand/90"
                >
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* ── STEP 2 · Connect ─────────────────────────────────── */}
            {step === 1 && (
              <div className="px-7 py-9 sm:px-9 sm:py-10">
                <span className="type-eyebrow text-foreground-muted">
                  Setup · Step 2 of 3
                </span>
                <h1 className="mt-4 type-display text-balance">
                  Connect your first source.
                </h1>
                <p className="mt-3 type-body text-foreground-muted">
                  Pick a platform to start monitoring. You can add more anytime.
                </p>

                <div className="mt-6 space-y-3">
                  {connectors.map((c) => {
                    const BrandIcon = BRAND_ICON_MAP[c.id];
                    const statusLabel = c.needsAttention
                      ? "Needs attention"
                      : c.connected
                      ? "Connected"
                      : "Not connected";
                    const statusTone = c.needsAttention
                      ? "border-warn/30 bg-warn/[0.08] text-warn"
                      : c.connected
                      ? "border-brand/30 bg-brand/[0.08] text-brand"
                      : "border-white/[0.1] bg-white/[0.03] text-foreground-muted";
                    return (
                      <Link
                        key={c.id}
                        href={c.href}
                        className="panel panel-hover group flex items-center gap-4 p-4"
                      >
                        {BrandIcon ? (
                          <BrandIcon className="h-9 w-9 shrink-0 opacity-95" />
                        ) : (
                          <GenericPlatformIcon
                            className="h-9 w-9 shrink-0 opacity-95"
                            label={c.name}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="type-body font-medium text-foreground/90">
                            {c.name}
                          </p>
                          <p className="mt-0.5 type-caption text-foreground-muted/60">
                            {c.description}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 type-caption font-medium",
                            statusTone
                          )}
                        >
                          <span
                            className={cn(
                              "h-[5px] w-[5px] rounded-full",
                              c.needsAttention
                                ? "bg-warn"
                                : c.connected
                                ? "bg-brand"
                                : "bg-foreground-muted/40"
                            )}
                          />
                          {statusLabel}
                        </span>
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-7 flex items-center justify-between">
                  <button
                    onClick={() => setStep(0)}
                    className="type-caption text-foreground-muted transition-colors hover:text-foreground"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2.5 type-caption font-medium text-foreground/80 transition-all hover:border-white/[0.2] hover:text-foreground"
                  >
                    {connectedCount > 0 ? "Continue" : "Skip for now"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3 · Ready ───────────────────────────────────── */}
            {step === 2 && (
              <div className="px-7 py-9 sm:px-9 sm:py-11">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                    <span className="anim-pulse absolute inline-flex h-2.5 w-2.5 rounded-full bg-brand/40" />
                    <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-brand shadow-[0_0_8px_2px] shadow-brand/50" />
                  </span>
                  <span className="type-eyebrow text-foreground-muted">
                    Mission Control is live
                  </span>
                </div>
                <h1 className="mt-5 type-display text-balance">
                  {connectedCount > 0
                    ? "Your AI is now watching."
                    : "You're all set."}
                </h1>
                <p className="mt-3 type-body text-foreground-muted">
                  {connectedCount > 0
                    ? `Ultrametrics is monitoring ${connectedCount} source${
                        connectedCount > 1 ? "s" : ""
                      } and will surface findings as data flows in.`
                    : "Connect a source anytime from Mission Control to begin monitoring."}
                </p>

                <div className="mt-7 space-y-3">
                  {[
                    {
                      label: "Sources connected",
                      value: `${connectedCount} active`,
                      done: connectedCount > 0,
                    },
                    { label: "Monitoring", value: "Active", done: true },
                    { label: "AI analysis", value: "Watching campaigns", done: true },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full",
                          row.done
                            ? "bg-brand/[0.12] text-brand"
                            : "bg-white/[0.05] text-foreground-muted/50"
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="flex-1 type-body text-foreground/85">
                        {row.label}
                      </span>
                      <span className="type-caption text-foreground-muted">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    router.push("/dashboard");
                    router.refresh();
                  }}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 type-body font-medium text-surface-0 shadow-[0_0_24px_0_hsl(var(--brand)/0.25)] transition-all hover:bg-brand/90"
                >
                  <Sparkles className="h-4 w-4" />
                  Enter Mission Control
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="py-4 type-caption text-foreground-muted/40">
          © {new Date().getFullYear()} Ultrametrics
        </p>
      </div>
    </div>
  );
}
