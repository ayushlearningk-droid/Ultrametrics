"use client";

/**
 * AI Skills Marketplace (Sprint 49) — premium catalog UI.
 *
 * Renders the Skills Registry descriptors as floating premium cards with search,
 * category filters, status/confidence badges, capability chips, and a details
 * drawer. Presentation only — reads everything from the descriptors passed by
 * the server page (registry = single source of truth). No execution, no data
 * fetching. Theme-aware (Sprint 46 tokens); motion from motion.ts (Sprint 40).
 */

import { useMemo, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  BarChart3,
  Palette,
  Megaphone,
  FileText,
  Building2,
  Blocks,
  Search,
  X,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { fadeIn, slideUp, staggerChildren, DUR, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import type {
  SkillDefinition,
  SkillCategory,
  Confidence,
} from "@/lib/ai/skills/types";

const CATEGORY_ICON: Record<SkillCategory, React.ElementType> = {
  analytics: BarChart3,
  creative: Palette,
  "media-buyer": Megaphone,
  reporting: FileText,
  workspace: Building2,
};

const CATEGORY_LABEL: Record<SkillCategory, string> = {
  analytics: "Analytics",
  creative: "Creative",
  "media-buyer": "Media Buyer",
  reporting: "Reporting",
  workspace: "Workspace",
};

function ConfidenceBadge({ level }: { level: Confidence }) {
  return (
    <span className={cn("chip", level === "high" ? "chip-emerald" : "chip-slate")}>
      {level} confidence
    </span>
  );
}

/** Status badges derived from the registry truth (no mock state). */
function StatusBadges({ skill }: { skill: SkillDefinition }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Built-in skills are registered → installed + enabled. */}
      <span className="chip chip-emerald">
        <CheckCircle2 className="h-3 w-3" />
        Installed
      </span>
      <span className="chip chip-slate">Enabled</span>
      {skill.executionMode === "read-only" && (
        <span className="chip chip-slate">
          <ShieldCheck className="h-3 w-3" />
          Read Only
        </span>
      )}
    </div>
  );
}

function SkillCardSkeleton() {
  return (
    <div className="card flex h-44 flex-col gap-3 p-5">
      <div className="skeleton h-8 w-8 rounded-lg" />
      <div className="skeleton h-4 w-1/2" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-3/4" />
      <div className="mt-auto flex gap-1.5">
        <div className="skeleton h-5 w-16 rounded-full" />
        <div className="skeleton h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function SkillsMarketplace({ skills }: { skills: SkillDefinition[] }) {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SkillCategory | "all">("all");
  const [active, setActive] = useState<SkillDefinition | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(skills.map((s) => s.category))),
    [skills]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.capabilities.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [skills, query, category]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-8">
      {/* Header */}
      <header className="surface-ai shadow-floating flex flex-col gap-4 p-6 md:p-8">
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 type-eyebrow text-foreground-muted">
            <Blocks className="h-3.5 w-3.5 text-brand" />
            Skills Marketplace
          </span>
          <h1 className="type-display text-foreground">Your AI Skills</h1>
          <p className="type-body max-w-2xl text-foreground-muted">
            Reusable, read-only intelligence capabilities — each grounded in your
            connected data. Browse what your AI Operating System can do.
          </p>
        </div>

        {/* Search */}
        <div className="card flex items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-foreground-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills, capabilities…"
            aria-label="Search skills"
            className="flex-1 bg-transparent type-body text-foreground outline-none placeholder:text-foreground-muted"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="rounded-md p-1 text-foreground-muted transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip
            label="All"
            active={category === "all"}
            onClick={() => setCategory("all")}
          />
          {categories.map((c) => (
            <FilterChip
              key={c}
              label={CATEGORY_LABEL[c]}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>
      </header>

      {/* Grid / loading / empty */}
      {!mounted ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((s) => (
            <SkillCardSkeleton key={s.id} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-[hsl(var(--card-fill))]">
            <Blocks className="h-5 w-5 text-foreground-muted" />
          </div>
          <p className="type-body font-semibold text-foreground">No skills found</p>
          <p className="max-w-sm type-caption text-foreground-muted">
            Try a different search term or category filter.
          </p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerChildren}
          initial={reduce ? false : "hidden"}
          animate="visible"
        >
          {filtered.map((skill) => {
            const Icon = CATEGORY_ICON[skill.category];
            return (
              <motion.button
                key={skill.id}
                type="button"
                variants={slideUp}
                onClick={() => setActive(skill)}
                className="card card-hover card-interactive flex flex-col gap-3 p-5 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-[hsl(var(--card-fill))] text-brand">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="type-caption text-foreground-muted">
                    {CATEGORY_LABEL[skill.category]}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="type-body font-semibold text-foreground">
                    {skill.name}
                  </span>
                  <span className="line-clamp-2 type-caption text-foreground-muted">
                    {skill.description}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {skill.capabilities.slice(0, 3).map((c) => (
                    <span key={c} className="chip chip-slate">
                      {c}
                    </span>
                  ))}
                  {skill.capabilities.length > 3 && (
                    <span className="chip chip-slate">
                      +{skill.capabilities.length - 3}
                    </span>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <ConfidenceBadge level={skill.confidence} />
                  <span className="inline-flex items-center gap-1 type-caption font-semibold text-brand">
                    Details
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      <SkillDetailsDrawer
        skill={active}
        onClose={() => setActive(null)}
        reduce={reduce}
      />
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 type-caption font-semibold transition-colors",
        active
          ? "border-brand/40 bg-brand/15 text-brand"
          : "border-border bg-[hsl(var(--card-fill))] text-foreground-muted hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function DefinitionList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="type-eyebrow text-foreground-muted">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((x) => (
          <span key={x} className="chip chip-slate">
            {x}
          </span>
        ))}
      </div>
    </div>
  );
}

function SkillDetailsDrawer({
  skill,
  onClose,
  reduce,
}: {
  skill: SkillDefinition | null;
  onClose: () => void;
  reduce: boolean | null;
}) {
  return (
    <AnimatePresence>
      {skill && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40"
            variants={fadeIn}
            initial={reduce ? false : "hidden"}
            animate="visible"
            exit="exit"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-[61] flex w-full flex-col overflow-y-auto border-l border-border bg-[hsl(var(--card))] shadow-2xl sm:w-[440px]"
            initial={reduce ? false : { x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE_OUT }}
            role="dialog"
            aria-label={`${skill.name} skill details`}
          >
            <div className="flex items-start justify-between gap-2 border-b border-border px-6 py-4">
              <div className="flex flex-col gap-1">
                <span className="type-eyebrow text-foreground-muted">
                  {CATEGORY_LABEL[skill.category]}
                </span>
                <h2 className="type-body font-semibold text-foreground">
                  {skill.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-[hsl(var(--card-fill-strong))] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-6 px-6 py-5">
              <p className="type-body leading-relaxed text-foreground/90">
                {skill.description}
              </p>

              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadges skill={skill} />
                <ConfidenceBadge level={skill.confidence} />
              </div>

              <DefinitionList title="Capabilities" items={skill.capabilities} />
              <DefinitionList title="Permissions" items={skill.permissions} />
              <DefinitionList title="Supported tools" items={skill.supportedTools} />

              <SchemaList title="Input" fields={skill.inputSchema} />
              <SchemaList title="Output" fields={skill.outputSchema} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function SchemaList({
  title,
  fields,
}: {
  title: string;
  fields: SkillDefinition["inputSchema"];
}) {
  if (fields.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="type-eyebrow text-foreground-muted">{title} schema</span>
      <div className="flex flex-col gap-2">
        {fields.map((f) => (
          <div key={f.name} className="card flex flex-col gap-0.5 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="type-caption font-semibold text-foreground">
                {f.name}
              </span>
              <span className="chip chip-slate">
                {f.type}
                {f.required ? " · required" : ""}
              </span>
            </div>
            <span className="type-caption text-foreground-muted">
              {f.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
