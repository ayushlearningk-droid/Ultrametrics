"use client";

/**
 * AI Studio Home (Sprint 63 · Home · Design System 2.0).
 *
 * The AI Workspace landing experience, mounted inside the shell's Workspace
 * Region. Composed from reusable primitives (StudioSection / PremiumCard /
 * PremiumEmptyState / ReservedSlot) + config (data.ts), styled entirely through
 * the Studio 2.0 token system (.studio-* materials) — no hardcoded radius,
 * glass, elevation, or glow.
 *
 * SCOPE: presentation only — no generation, providers, APIs, canvas, timeline,
 * or inspector. All interactive entry points are inert placeholders.
 */

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Play,
  Bookmark,
  Wand2,
  BarChart3,
  FolderOpen,
  Layers,
  Lightbulb,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import { slideUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ReservedSlot } from "@/components/studio/shell/shell-region";
import { StudioSection, PremiumCard, PremiumEmptyState } from "./primitives";
import { StudioHero } from "./hero";
import {
  CREATE_TYPES,
  STUDIO_EMPLOYEES,
  BRAND_FACETS,
  RAIL_PLACEHOLDER_COUNT,
  type StudioEmployee,
  type CreateType,
  type BrandFacet,
} from "./data";

/* ── Scroll-reveal section transition (premium, reduced-motion safe) ──────── */
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

/* ── Cards (all built from PremiumCard + Studio tokens — no duplicated chassis) ── */

/** Trending / inspiration card: cinematic, autoplay-ready media + reserved metrics. */
function MediaRailCard({ kind }: { kind: "trending" | "inspiration" }) {
  const isTrending = kind === "trending";
  return (
    <PremiumCard interactive className="studio-snap flex w-[280px] shrink-0 flex-col">
      {/* Autoplay-ready cinematic media area (placeholder) */}
      <div className="studio-media relative flex aspect-[4/5] items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.1] bg-black/30 text-foreground-muted backdrop-blur-sm">
          <Play className="h-4 w-4" />
        </div>
        {isTrending && (
          <span className="absolute left-2.5 top-2.5 rounded-[var(--studio-radius-sm)] bg-black/40 px-1.5 py-0.5 type-caption text-foreground-muted backdrop-blur-sm">
            Platform
          </span>
        )}
        {isTrending && (
          <div className="absolute right-2.5 top-2.5 flex gap-1">
            <span className="chip chip-slate">CTR</span>
            <span className="chip chip-slate">ROAS</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-3 py-3">
        {isTrending ? (
          <>
            <MiniAction icon={Bookmark} label="Save" />
            <MiniAction icon={Wand2} label="Remix" />
            <MiniAction icon={BarChart3} label="Analyze" />
          </>
        ) : (
          <p className="type-caption text-foreground-muted">Inspiration</p>
        )}
      </div>
    </PremiumCard>
  );
}

function MiniAction({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      aria-disabled
      title="Coming soon"
      className="studio-focusable flex cursor-default items-center gap-1 rounded-[var(--studio-radius-sm)] px-1.5 py-1 text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="type-caption">{label}</span>
    </button>
  );
}

/** AI Employee card — feels alive (status aura) before logic exists. */
function EmployeeCard({ employee }: { employee: StudioEmployee }) {
  const { name, role, icon: Icon, status } = employee;
  const ready = status === "Ready";
  return (
    <PremiumCard interactive className="studio-snap flex w-[208px] shrink-0 flex-col gap-3.5 p-4">
      <div className="flex items-center gap-2.5">
        <div className="studio-tile relative flex h-9 w-9 items-center justify-center text-foreground-muted">
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
      <span className={cn("chip w-fit", ready ? "chip-emerald" : "chip-slate")}>
        {status}
      </span>
    </PremiumCard>
  );
}

/** Create entry card (inert this sprint). */
function CreateCard({ type }: { type: CreateType }) {
  const { label, icon: Icon } = type;
  return (
    <PremiumCard
      interactive
      role="button"
      aria-label={`Create ${label} (coming soon)`}
      aria-disabled
      title="Coming soon"
      className="studio-focusable flex flex-col items-center justify-center gap-3 py-8"
    >
      <div className="studio-tile flex h-12 w-12 items-center justify-center text-foreground-muted">
        <Icon className="h-5 w-5" />
      </div>
      <p className="type-body font-semibold text-foreground">{label}</p>
    </PremiumCard>
  );
}

/** Brand facet tile — Files-app calm. */
function BrandTile({ facet }: { facet: BrandFacet }) {
  const { label, icon: Icon } = facet;
  return (
    <PremiumCard interactive className="studio-focusable flex flex-col gap-2.5 p-4">
      <div className="studio-tile flex h-9 w-9 items-center justify-center text-foreground-muted">
        <Icon className="h-4 w-4" />
      </div>
      <p className="type-body font-semibold text-foreground">{label}</p>
      <span className="chip chip-slate w-fit">Empty</span>
    </PremiumCard>
  );
}

/* ── The Home composition ─────────────────────────────────────────────────── */

export function StudioHome() {
  const reduce = useReducedMotion();
  const rail = Array.from({ length: RAIL_PLACEHOLDER_COUNT });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-16 px-4 py-10 md:px-8 md:py-14">
      {/* 1 · Hero AI Workspace — the visual center */}
      <motion.div
        variants={slideUp}
        initial={reduce ? false : "hidden"}
        animate="visible"
      >
        <StudioHero />
      </motion.div>

      {/* 2 · Continue Working */}
      <Reveal>
        <StudioSection label="Continue Working" description="Resume where you left off.">
          <PremiumEmptyState
            icon={<FolderOpen className="h-5 w-5" />}
            title="No projects yet"
            description="Your AI Studio projects will appear here, ready to resume."
          />
        </StudioSection>
      </Reveal>

      {/* 3 · Trending Winning Ads */}
      <Reveal>
        <StudioSection
          label="Trending Winning Ads"
          description="High-performing patterns — save, remix, analyze."
        >
          <div className="studio-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {rail.map((_, i) => (
              <MediaRailCard key={i} kind="trending" />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 4 · AI Employees */}
      <Reveal>
        <StudioSection label="AI Employees" description="Your always-on creative team.">
          <div className="studio-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {STUDIO_EMPLOYEES.map((e) => (
              <EmployeeCard key={e.id} employee={e} />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 5 · Create */}
      <Reveal>
        <StudioSection label="Create" description="Start something new.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {CREATE_TYPES.map((t) => (
              <CreateCard key={t.id} type={t} />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 6 · Brand Workspace */}
      <Reveal>
        <StudioSection label="Brand Workspace" description="Everything that keeps you on-brand.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {BRAND_FACETS.map((f) => (
              <BrandTile key={f.id} facet={f} />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 7 · Recent Assets */}
      <Reveal>
        <StudioSection label="Recent Assets">
          <PremiumEmptyState
            icon={<ImageIcon className="h-5 w-5" />}
            title="No assets yet"
            description="Generated and uploaded assets will collect here."
          />
        </StudioSection>
      </Reveal>

      {/* 8 · Collections */}
      <Reveal>
        <StudioSection label="Collections">
          <PremiumEmptyState
            icon={<Layers className="h-5 w-5" />}
            title="No collections yet"
            description="Group related work into collections — coming soon."
          />
        </StudioSection>
      </Reveal>

      {/* 9 · Inspirations */}
      <Reveal>
        <StudioSection label="Inspirations" description="A wall of ideas to remix.">
          <div className="studio-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {rail.map((_, i) => (
              <MediaRailCard key={i} kind="inspiration" />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* Reserved: deeper Home modules mount here without redesign. */}
      <Reveal>
        <ReservedSlot
          label="More workspace modules"
          icon={<Lightbulb className="h-4 w-4" />}
          hint="Reserved for future Roadmap 8.0 modules"
        />
      </Reveal>
    </div>
  );
}
