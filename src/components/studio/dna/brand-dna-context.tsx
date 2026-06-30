"use client";

/**
 * Production Marketing DNA — context + presentational primitives (Sprint 63R).
 *
 * A lightweight provider exposing the active Marketing DNA to the Command Center
 * (summary + profiles) and the generation flow. Deterministic — defaults to the
 * shipped brand brain; no backend, no settings persistence. The shared DnaCard /
 * DnaField primitives keep every profile component consistent without
 * duplicating markup.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_BRAND_DNA, type MarketingDNAProfile } from "./brand-dna";

interface BrandDnaContextValue {
  dna: MarketingDNAProfile;
}

const BrandDnaContext = createContext<BrandDnaContextValue | null>(null);

export function BrandDnaProvider({
  dna = DEFAULT_BRAND_DNA,
  children,
}: {
  dna?: MarketingDNAProfile;
  children: ReactNode;
}) {
  const value = useMemo<BrandDnaContextValue>(() => ({ dna }), [dna]);
  return <BrandDnaContext.Provider value={value}>{children}</BrandDnaContext.Provider>;
}

/** Read the active Marketing DNA. Falls back to the default outside a provider. */
export function useBrandDna(): MarketingDNAProfile {
  return useContext(BrandDnaContext)?.dna ?? DEFAULT_BRAND_DNA;
}

/* ── Shared presentational primitives (reused by every profile) ──────────── */

export function DnaCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="studio-card flex flex-col gap-2.5 p-4">
      <header className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
        {icon}
        {title}
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

export function DnaField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 type-caption text-foreground-muted">{label}</span>
      <span className="min-w-0 text-right type-caption font-medium text-foreground">{value}</span>
    </div>
  );
}

export function DnaChips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {items.map((t) => (
        <span key={t} className="chip chip-slate">{t}</span>
      ))}
    </div>
  );
}
