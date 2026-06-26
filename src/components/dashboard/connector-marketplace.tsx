"use client";

/**
 * Connector Marketplace (Sprint 50) — premium catalog UI.
 *
 * Renders the connector catalog (single source of truth) as floating premium
 * cards with search, category tabs, status/feature badges, and a details
 * drawer. Live providers reuse their existing connect routes; coming-soon
 * entries never offer a connect action. Presentation only — no fetches, no
 * backend. Theme-aware (Sprint 46 tokens); motion from motion.ts (Sprint 40).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Search,
  X,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Megaphone,
  LineChart,
  Users,
  ShoppingCart,
  Database,
  MessageSquare,
  NotebookPen,
  Share2,
  Mail,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { fadeIn, slideUp, staggerChildren, DUR, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import {
  CONNECTOR_CATEGORIES,
  type ConnectorDefinition,
  type ConnectorCategory,
  type ConnectorLogo,
} from "@/lib/connectors/catalog";

/** Logo key → icon (kept here so the catalog stays serializable). */
const LOGO_ICON: Record<ConnectorLogo, LucideIcon> = {
  "google-ads": LineChart,
  meta: Megaphone,
  sheets: Database,
  ga4: LineChart,
  shopify: ShoppingCart,
  tiktok: Share2,
  amazon: ShoppingCart,
  hubspot: Users,
  salesforce: Users,
  klaviyo: Mail,
  slack: MessageSquare,
  notion: NotebookPen,
  linkedin: Share2,
  pinterest: Share2,
  snowflake: Database,
  stripe: ShoppingCart,
  openai: Sparkles,
};

type DisplayStatus = "Connected" | "Not Connected" | "Coming Soon";

function statusOf(c: ConnectorDefinition, connected: boolean): DisplayStatus {
  if (c.comingSoon) return "Coming Soon";
  return connected ? "Connected" : "Not Connected";
}

function StatusBadge({ status }: { status: DisplayStatus }) {
  if (status === "Connected") {
    return (
      <span className="chip chip-emerald">
        <CheckCircle2 className="h-3 w-3" />
        Connected
      </span>
    );
  }
  if (status === "Coming Soon") {
    return (
      <span className="chip chip-slate">
        <Clock3 className="h-3 w-3" />
        Coming Soon
      </span>
    );
  }
  return <span className="chip chip-slate">Not Connected</span>;
}

export function ConnectorMarketplace({
  catalog,
  connectedIds,
}: {
  catalog: ConnectorDefinition[];
  connectedIds: string[];
}) {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ConnectorCategory | "all">("all");
  const [active, setActive] = useState<ConnectorDefinition | null>(null);

  const connected = useMemo(() => new Set(connectedIds), [connectedIds]);

  // Escape closes the details drawer; lock background scroll while open.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active]);

  const connectedCount = useMemo(
    () => catalog.filter((c) => connected.has(c.id)).length,
    [catalog, connected]
  );
  const availableCount = useMemo(
    () => catalog.filter((c) => !c.comingSoon).length,
    [catalog]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((c) => {
      if (category !== "all" && c.category !== category) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.supportedFeatures.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [catalog, query, category]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-8">
      {/* Header */}
      <motion.header
        variants={fadeIn}
        initial={reduce ? false : "hidden"}
        animate="visible"
        className="surface-ai shadow-floating flex flex-col gap-4 p-6 md:p-8"
      >
        <div className="flex flex-col gap-2">
          <span className="type-eyebrow text-foreground-muted">
            Connector Marketplace
          </span>
          <h1 className="type-display text-foreground">Connect your data</h1>
          <p className="type-body max-w-2xl text-foreground-muted">
            Bring every channel into your AI Operating System. Read-only,
            encrypted, and ready for future OAuth integrations.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="chip chip-emerald tabular-nums">
              {connectedCount} connected
            </span>
            <span className="chip chip-slate tabular-nums">
              {availableCount} available
            </span>
            <span className="chip chip-slate tabular-nums">
              {catalog.length} total
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="card flex items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-foreground-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search connectors, features…"
            aria-label="Search connectors"
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

        {/* Category tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip label="All" active={category === "all"} onClick={() => setCategory("all")} />
          {CONNECTOR_CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              label={c}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>
      </motion.header>

      {/* Grid / loading / empty */}
      {!mounted ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.slice(0, 6).map((c) => (
            <CardSkeleton key={c.id} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-[hsl(var(--card-fill))]">
            <Search className="h-5 w-5 text-foreground-muted" />
          </div>
          <p className="type-body font-semibold text-foreground">No connectors found</p>
          <p className="max-w-sm type-caption text-foreground-muted">
            Try a different search term or category.
          </p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerChildren}
          initial={reduce ? false : "hidden"}
          animate="visible"
        >
          {filtered.map((c) => {
            const Icon = LOGO_ICON[c.logo];
            const isConnected = connected.has(c.id);
            const status = statusOf(c, isConnected);
            return (
              <motion.button
                key={c.id}
                type="button"
                variants={slideUp}
                onClick={() => setActive(c)}
                className="card card-hover card-interactive flex flex-col gap-3 p-5 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border"
                    style={{ backgroundColor: `${c.color}1A`, color: c.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="type-caption text-foreground-muted">{c.category}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="type-body font-semibold text-foreground">{c.name}</span>
                  <span className="line-clamp-2 type-caption text-foreground-muted">
                    {c.description}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {c.supportedFeatures.slice(0, 2).map((f) => (
                    <span key={f} className="chip chip-slate">{f}</span>
                  ))}
                  {c.supportedFeatures.length > 2 && (
                    <span className="chip chip-slate">+{c.supportedFeatures.length - 2}</span>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <StatusBadge status={status} />
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

      <DetailsDrawer
        connector={active}
        connected={active ? connected.has(active.id) : false}
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

function CardSkeleton() {
  return (
    <div className="card flex h-44 flex-col gap-3 p-5">
      <div className="skeleton h-10 w-10 rounded-xl" />
      <div className="skeleton h-4 w-1/2" />
      <div className="skeleton h-3 w-full" />
      <div className="mt-auto flex gap-1.5">
        <div className="skeleton h-5 w-16 rounded-full" />
        <div className="skeleton h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

function DefBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="type-eyebrow text-foreground-muted">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((x) => (
          <span key={x} className="chip chip-slate">{x}</span>
        ))}
      </div>
    </div>
  );
}

function DetailsDrawer({
  connector,
  connected,
  onClose,
  reduce,
}: {
  connector: ConnectorDefinition | null;
  connected: boolean;
  onClose: () => void;
  reduce: boolean | null;
}) {
  return (
    <AnimatePresence>
      {connector && (
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
            className="fixed inset-y-0 right-0 z-[61] flex w-full flex-col overflow-y-auto border-l border-border bg-[hsl(var(--card))] shadow-2xl sm:w-[460px]"
            initial={reduce ? false : { x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE_OUT }}
            role="dialog"
            aria-label={`${connector.name} connector details`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <DrawerLogo connector={connector} />
                <div className="flex flex-col">
                  <span className="type-eyebrow text-foreground-muted">{connector.category}</span>
                  <h2 className="type-body font-semibold text-foreground">{connector.name}</h2>
                </div>
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

            <div className="flex flex-1 flex-col gap-6 px-6 py-5">
              <p className="type-body leading-relaxed text-foreground/90">{connector.description}</p>

              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={statusOf(connector, connected)} />
                <span className="chip chip-slate">
                  <ShieldCheck className="h-3 w-3" />
                  Read Only
                </span>
                {connector.oauthSupported && <span className="chip chip-slate">OAuth</span>}
                {connector.comingSoon && <span className="chip chip-slate">Future Ready</span>}
              </div>

              <DefBlock title="Capabilities" items={connector.supportedFeatures} />
              <DefBlock title="Permissions" items={connector.permissions} />
              <DefBlock title="Required scopes" items={connector.requiredScopes} />

              <div className="flex flex-col gap-2">
                <span className="type-eyebrow text-foreground-muted">Security</span>
                <p className="card p-3 type-caption text-foreground-muted">
                  {connector.securityNotes}
                </p>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center gap-2 border-t border-border px-6 py-4">
              {connector.connectHref && !connector.comingSoon ? (
                <Link
                  href={connector.connectHref}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 type-caption font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
                >
                  {connected ? "Manage" : "Connect"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2 type-caption font-semibold text-foreground-muted opacity-60"
                >
                  Coming soon
                </button>
              )}
              {connector.docsUrl && (
                <a
                  href={connector.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 type-caption font-semibold text-foreground-muted transition-colors hover:text-foreground"
                >
                  Docs
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerLogo({ connector }: { connector: ConnectorDefinition }) {
  const Icon = LOGO_ICON[connector.logo];
  return (
    <span
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-border"
      style={{ backgroundColor: `${connector.color}1A`, color: connector.color }}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}
