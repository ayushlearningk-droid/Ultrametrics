"use client";

/**
 * AI Studio Home (Sprint 63 · production media).
 *
 * Media-dominant landing experience, mounted as the Home region of the Unified
 * Workspace. Now uses the PRODUCTION media components (AdPoster · UGCCard ·
 * VideoPreviewCard · CreativeThumbnail · badges) instead of inline placeholders.
 * Presentation only — components render real media when a source is supplied and
 * an honest empty-media frame otherwise. No generation, providers, or APIs.
 */

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bookmark, Wand2, BarChart3, Lightbulb, type LucideIcon } from "lucide-react";
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
import {
  AdPoster,
  UGCCard,
  VideoPreviewCard,
  CreativeThumbnail,
  type MediaSource,
  type PerformanceMetric,
  type PlatformId,
} from "@/components/studio/media";

/* ── Sample content (structured props — real components, empty media frames) ── */
const VIDEO_MEDIA: MediaSource = { kind: "video" };

const TRENDING: {
  id: string;
  title: string;
  subtitle: string;
  platform: PlatformId;
  metrics: PerformanceMetric[];
}[] = [
  { id: "t1", title: "Problem-first hook", subtitle: "Win-back angle", platform: "reels", metrics: [{ label: "CTR", value: "3.2%", tone: "positive" }, { label: "ROAS", value: "4.1x", tone: "neutral" }] },
  { id: "t2", title: "Founder story", subtitle: "Trust angle", platform: "tiktok", metrics: [{ label: "CTR", value: "2.7%", tone: "positive" }] },
  { id: "t3", title: "Before / after", subtitle: "Proof angle", platform: "shorts", metrics: [{ label: "ROAS", value: "3.6x", tone: "neutral" }] },
  { id: "t4", title: "Unboxing", subtitle: "Curiosity angle", platform: "reels", metrics: [{ label: "CTR", value: "2.1%", tone: "neutral" }] },
  { id: "t5", title: "Comparison", subtitle: "Consideration", platform: "meta", metrics: [{ label: "ROAS", value: "2.9x", tone: "neutral" }] },
  { id: "t6", title: "Testimonial", subtitle: "Social proof", platform: "tiktok", metrics: [{ label: "CTR", value: "3.9%", tone: "positive" }] },
];

const UGC: { id: string; handle: string; hook: string; platform: PlatformId; metrics: PerformanceMetric[] }[] = [
  { id: "u1", handle: "mayacreates", hook: "This fixed my morning routine in 7 days.", platform: "tiktok", metrics: [{ label: "CTR", value: "2.8%", tone: "positive" }] },
  { id: "u2", handle: "leoonbudget", hook: "I didn't expect the third one to work.", platform: "reels", metrics: [{ label: "CTR", value: "3.1%", tone: "positive" }] },
  { id: "u3", handle: "thesarah", hook: "Honestly skeptical — then this happened.", platform: "shorts", metrics: [{ label: "ROAS", value: "3.3x", tone: "neutral" }] },
  { id: "u4", handle: "dailydose", hook: "POV: you finally found the one.", platform: "tiktok", metrics: [{ label: "CTR", value: "2.5%", tone: "neutral" }] },
  { id: "u5", handle: "ninaedits", hook: "Stop scrolling — this is for you.", platform: "reels", metrics: [{ label: "CTR", value: "3.4%", tone: "positive" }] },
];

const PROJECTS = [
  { id: "p1", title: "Summer Launch", subtitle: "Edited 2h ago", duration: "0:15", platform: "reels" as PlatformId },
  { id: "p2", title: "Win-back UGC", subtitle: "Edited yesterday", duration: "0:22", platform: "tiktok" as PlatformId },
  { id: "p3", title: "Brand Film", subtitle: "Draft", duration: "0:30", platform: undefined },
];

const COLLECTIONS = [
  { id: "c1", title: "Top Performers", subtitle: "Smart collection" },
  { id: "c2", title: "TikTok Hooks", subtitle: "12 assets" },
];

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

/* ── AI Employee card ─────────────────────────────────────────────────────── */
function EmployeeCard({ employee }: { employee: StudioEmployee }) {
  const { name, role, icon: Icon, status } = employee;
  const ready = status === "Ready";
  return (
    <PremiumCard interactive className="studio-snap flex w-[212px] shrink-0 flex-col gap-3.5 p-4">
      <div className="flex items-center gap-2.5">
        <div className="studio-tile relative flex h-10 w-10 items-center justify-center text-foreground-muted">
          <Icon className="h-4 w-4" />
          <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[hsl(222_44%_6%)]", ready ? "bg-brand" : "bg-foreground-muted/50")} />
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

/* ── Create entry card ────────────────────────────────────────────────────── */
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

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-16 px-1 py-4">
      {/* 1 · Hero */}
      <motion.div variants={slideUp} initial={reduce ? false : "hidden"} animate="visible">
        <StudioHero />
      </motion.div>

      {/* 2 · Continue Working — video preview cards */}
      <Reveal>
        <StudioSection label="Continue Working" description="Pick up where you left off.">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECTS.map((p) => (
              <VideoPreviewCard key={p.id} title={p.title} subtitle={p.subtitle} duration={p.duration} platform={p.platform} />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 3 · Trending — cinematic ad posters */}
      <Reveal>
        <StudioSection label="Trending Winning Ads" description="High-performing patterns — save, remix, analyze.">
          <div className="studio-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-3">
            {TRENDING.map((t) => (
              <AdPoster
                key={t.id}
                media={VIDEO_MEDIA}
                title={t.title}
                subtitle={t.subtitle}
                platform={t.platform}
                metrics={t.metrics}
                actions={
                  <div className="flex items-center gap-1.5">
                    <PosterAction icon={Bookmark} label="Save" />
                    <PosterAction icon={Wand2} label="Remix" />
                    <PosterAction icon={BarChart3} label="Analyze" />
                  </div>
                }
              />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 4 · Create */}
      <Reveal>
        <StudioSection label="Create" description="Start something new.">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {CREATE_TYPES.map((t) => (
              <CreateCard key={t.id} type={t} />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 5 · AI Employees */}
      <Reveal>
        <StudioSection label="AI Employees" description="Your always-on creative team.">
          <div className="studio-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {STUDIO_EMPLOYEES.map((e) => (
              <EmployeeCard key={e.id} employee={e} />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 6 · Brand Workspace */}
      <Reveal>
        <StudioSection label="Brand Workspace" description="Everything that keeps you on-brand.">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {BRAND_FACETS.map((f) => (
              <BrandTile key={f.id} facet={f} />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 7 · Recent Assets — creative thumbnails */}
      <Reveal>
        <StudioSection label="Recent Assets">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CreativeThumbnail key={i} media={{ kind: "image" }} aspect="square" />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 8 · Collections — video preview cards */}
      <Reveal>
        <StudioSection label="Collections" description="Group your best work.">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {COLLECTIONS.map((c) => (
              <VideoPreviewCard key={c.id} title={c.title} subtitle={c.subtitle} />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* 9 · Inspirations — UGC cards */}
      <Reveal>
        <StudioSection label="Inspirations" description="A wall of ideas to remix.">
          <div className="studio-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-3">
            {UGC.map((u) => (
              <UGCCard key={u.id} handle={u.handle} hook={u.hook} platform={u.platform} metrics={u.metrics} />
            ))}
          </div>
        </StudioSection>
      </Reveal>

      {/* Reserved: deeper Home modules mount here without redesign. */}
      <Reveal>
        <div className="studio-reserved flex items-center justify-center gap-2 px-4 py-6 text-center">
          <Lightbulb className="h-4 w-4 text-foreground-muted" />
          <span className="type-caption text-foreground-muted">More workspace modules · reserved for future Roadmap 8.0</span>
        </div>
      </Reveal>
    </div>
  );
}
