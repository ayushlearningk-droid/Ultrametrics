"use client";

/**
 * AI Studio Home (Sprint 63F · Visual Excellence).
 *
 * Premium, media-dominant creative landing experience. Presentation only —
 * reuses the Studio 2.0 tokens + primitives (StudioSection / PremiumCard /
 * PremiumEmptyState / ReservedSlot) and the Netflix-style `studio-poster`
 * utility. No new features, no AI, no providers, no APIs, no architecture
 * change. All interactive entry points are inert placeholders.
 */

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Play,
  Bookmark,
  Wand2,
  BarChart3,
  Lightbulb,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import { slideUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { StudioSection, PremiumCard } from "./primitives";
import { StudioHero } from "./hero";
import {
  CREATE_TYPES,
  STUDIO_EMPLOYEES,
  BRAND_FACETS,
  type StudioEmployee,
  type CreateType,
  type BrandFacet,
} from "./data";

/* ── Scroll-reveal section transition ─────────────────────────────────────── */
function Reveal({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={slideUp}
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
    >
      {children}
    </motion.div>
  );
}

/* ── Netflix-style portrait poster (Trending / Inspirations) ──────────────── */
function Poster({ kind }: { kind: "trending" | "inspiration" }) {
  const isTrending = kind === "trending";
  return (
    <div className="studio-poster studio-snap relative w-[208px] shrink-0 md:w-[228px]">
      <div className="studio-media relative aspect-[2/3]">
        <div className="absolute inset-0 flex items-center justify-center text-foreground-muted/50">
          <Play className="h-7 w-7" />
        </div>

        {isTrending && (
          <span className="absolute left-2.5 top-2.5 rounded-[var(--studio-radius-sm)] bg-black/45 px-1.5 py-0.5 type-caption text-foreground-muted backdrop-blur-sm">
            Reels
          </span>
        )}
        {isTrending && (
          <div className="absolute right-2.5 top-2.5 flex gap-1">
            <span className="chip chip-emerald">CTR</span>
            <span className="chip chip-slate">ROAS</span>
          </div>
        )}

        {/* Bottom gradient + title + hover actions */}
        <div className="studio-poster-overlay absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3">
          <p className="type-body font-semibold text-foreground">
            {isTrending ? "Problem-first hook" : "Editorial mood"}
          </p>
          {isTrending ? (
            <div className="flex items-center gap-1">
              <PosterAction icon={Bookmark} label="Save" />
              <PosterAction icon={Wand2} label="Remix" />
              <PosterAction icon={BarChart3} label="Analyze" />
            </div>
          ) : (
            <span className="type-caption text-foreground-muted">Inspiration</span>
          )}
        </div>
      </div>
    </div>
  );
}

function PosterAction({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      aria-disabled
      title="Coming soon"
      aria-label={label}
      className="studio-focusable flex h-7 w-7 cursor-default items-center justify-center rounded-full bg-white/[0.08] text-foreground-muted transition-colors hover:bg-white/[0.16] hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/* ── Landscape project poster (Continue Working) ──────────────────────────── */
const PROJECT_PLACEHOLDERS = [
  { id: "p1", title: "Summer Launch", meta: "Edited 2h ago", progress: 72 },
  { id: "p2", title: "Win-back UGC", meta: "Edited yesterday", progress: 40 },
  { id: "p3", title: "Brand Film", meta: "Draft", progress: 15 },
];

function ProjectPoster({ title, meta, progress }: { title: string; meta: string; progress: number }) {
  return (
    <div className="studio-poster relative aspect-[16/10] w-full cursor-default">
      <div className="studio-media absolute inset-0 flex items-center justify-center text-foreground-muted/40">
        <Play className="h-8 w-8" />
      </div>
      <div className="studio-poster-overlay absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4">
        <div className="flex items-end justify-between gap-2">
          <p className="type-body font-semibold text-foreground">{title}</p>
          <span className="type-caption text-foreground-muted">{meta}</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.12]">
          <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

/* ── Square asset tile (Recent Assets) ────────────────────────────────────── */
function AssetTile() {
  return (
    <div className="studio-poster relative aspect-square w-full cursor-default">
      <div className="studio-media absolute inset-0 flex items-center justify-center text-foreground-muted/40">
        <ImageIcon className="h-6 w-6" />
      </div>
    </div>
  );
}

/* ── AI Employee card ─────────────────────────────────────────────────────── */
function EmployeeCard({ employee }: { employee: StudioEmployee }) {
  const { name, role, icon: Icon, status } = employee;
  const ready = status === "Ready";
  return (
    <PremiumCard interactive className="studio-snap flex w-[212px] shrink-0 flex-col gap-3.5 p-4">
      <div className="flex items-center gap-2.5">
        <div className="studio-tile relative flex h-10 w-10 items-center justify-center text-foreground-muted">
          <Icon className="h-4 w-4" />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[hsl(222_44%_6%)]",
              ready ? "bg-brand" : "bg-foreground-muted/50"
            )}
          />
        </div>
        <div className="min-w-0">
          <p className="truncate type-body font-semibold text-foreground">{name}</p>
          <p className="truncate type-caption text-foreground-muted">{role}</p>
        </div>
      </div>
      <span className={cn("chip w-fit", ready ? "chip-emerald" : "chip-slate")}>{status}</span>
    </PremiumCard>
  );
}

/* ── Create entry card (visual) ───────────────────────────────────────────── */
function CreateCard({ type }: { type: CreateType }) {
  const { label, icon: Icon } = type;
  return (
    <PremiumCard
      interactive
      role="button"
      aria-label={`Create ${label} (coming soon)`}
      aria-disabled
      title="Coming soon"
      className="studio-focusable flex aspect-[4/3] flex-col items-center justify-center gap-3"
    >
      <div className="studio-tile flex h-14 w-14 items-center justify-center text-foreground-muted">
        <Icon className="h-6 w-6" />
      </div>
      <p className="type-body font-semibold text-foreground">{label}</p>
    </PremiumCard>
  );
}

/* ── Brand facet tile ─────────────────────────────────────────────────────── */
function BrandTile({ facet }: { facet: BrandFacet }) {
  const { label, icon: Icon } = facet;
  return (
    <PremiumCard interactive className="studio-focusable flex flex-col gap-2.5 p-4">
      <div className="studio-tile flex h-10 w-10 items-center justify-center text-foreground-muted">
        <Icon className="h-4 w-4" />
      </div>
      <p className="type-body font-semibold text-foreground">{label}</p>
      <span className="chip chip-slate w-fit">Empty</span>
    </PremiumCard>
  );
}

/* ── Composition ──────────────────────────────────────────────────────────── */
export function StudioHome() {
  const reduce = useReducedMotion();
  const posters = Array.from({ length: 7 });

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-24 px-4 py-10 md:px-10 md:py-16">
      {/* 1 · Hero — the dominant visual center */}
      <motion.div variants={slideUp} initial={reduce ? false : "hidden"} animate="visible">
        <StudioHero />
      </motion.div>

      {/* 2 · Projects (Continue Working) — landscape posters */}
      <Reveal>
        <StudioSection label="Continue Working" description="Pick up where you left off.">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECT_PLACEHOLDERS.map((p) => (
              <ProjectPoster key={p.id} title={p.title} meta={p.meta} progress={p.progress} />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 3 · Trending — Netflix-style poster rail (full-bleed) */}
      <Reveal>
        <StudioSection
          label="Trending Winning Ads"
          description="High-performing patterns — save, remix, analyze."
        >
          <div className="studio-scroll -mx-4 flex gap-4 overflow-x-auto px-4 pb-3 md:-mx-10 md:px-10">
            {posters.map((_, i) => (
              <Poster key={i} kind="trending" />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 4 · Create — large visual cards */}
      <Reveal>
        <StudioSection label="Create" description="Start something new.">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {CREATE_TYPES.map((t) => (
              <CreateCard key={t.id} type={t} />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 5 · AI Employees — rail */}
      <Reveal>
        <StudioSection label="AI Employees" description="Your always-on creative team.">
          <div className="studio-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {STUDIO_EMPLOYEES.map((e) => (
              <EmployeeCard key={e.id} employee={e} />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 6 · Brand Workspace — tiles */}
      <Reveal>
        <StudioSection label="Brand Workspace" description="Everything that keeps you on-brand.">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {BRAND_FACETS.map((f) => (
              <BrandTile key={f.id} facet={f} />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 7 · Recent Assets — square media grid */}
      <Reveal>
        <StudioSection label="Recent Assets">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <AssetTile key={i} />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 8 · Collections — wide landscape posters */}
      <Reveal>
        <StudioSection label="Collections" description="Group your best work.">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ProjectPoster title="Top Performers" meta="Smart collection" progress={100} />
            <ProjectPoster title="TikTok Hooks" meta="12 assets" progress={100} />
          </div>
        </StudioSection>
      </Reveal>

      {/* 9 · Inspirations — portrait poster rail (full-bleed) */}
      <Reveal>
        <StudioSection label="Inspirations" description="A wall of ideas to remix.">
          <div className="studio-scroll -mx-4 flex gap-4 overflow-x-auto px-4 pb-3 md:-mx-10 md:px-10">
            {posters.map((_, i) => (
              <Poster key={i} kind="inspiration" />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* Reserved: deeper Home modules mount here without redesign. */}
      <Reveal>
        <div className="studio-reserved flex items-center justify-center gap-2 px-4 py-6 text-center">
          <Lightbulb className="h-4 w-4 text-foreground-muted" />
          <span className="type-caption text-foreground-muted">
            More workspace modules · reserved for future Roadmap 8.0
          </span>
        </div>
      </Reveal>
    </div>
  );
}
