"use client";

/**
 * Workspace Settings panel (Sprint 16).
 *
 * Workspace-scoped feature flags, locale preferences, notification preferences,
 * and environment. Loads from GET /api/workspace/settings and saves via PUT.
 * Design tokens only (.card / type-* / chip); motion exclusively from
 * src/lib/motion.ts. Preferences only — toggling a flag here does not change
 * connector or Action Engine behaviour.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, FlaskConical, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { staggerChildren, slideUp } from "@/lib/motion";
import type {
  WorkspaceSettingsValues,
  DateFormat,
  Environment,
} from "@/lib/data/workspace-settings";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
];
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY"];
const DATE_FORMATS: DateFormat[] = [
  "YYYY-MM-DD",
  "MM/DD/YYYY",
  "DD/MM/YYYY",
  "D MMM YYYY",
];

type BoolKey = {
  [K in keyof WorkspaceSettingsValues]: WorkspaceSettingsValues[K] extends boolean
    ? K
    : never;
}[keyof WorkspaceSettingsValues];

const FEATURE_FLAGS: { key: BoolKey; label: string; description: string }[] = [
  { key: "ai_insights_enabled", label: "AI Insights", description: "Generate the Morning Brief and grounded recommendations." },
  { key: "action_engine_enabled", label: "Action Engine", description: "Surface execution controls for approved actions." },
  { key: "scheduled_actions_enabled", label: "Scheduled Actions", description: "Allow actions to be queued for later execution." },
  { key: "autonomous_ai_enabled", label: "Autonomous AI", description: "Let the assistant act without per-step approval." },
  { key: "beta_features_enabled", label: "Beta Features", description: "Opt this workspace into experimental features." },
];

const NOTIFICATIONS: { key: BoolKey; label: string; description: string }[] = [
  { key: "notify_email", label: "Email", description: "Send important updates to your email." },
  { key: "notify_in_app", label: "In-app", description: "Show notifications inside Ultrametrics." },
  { key: "notify_failed_sync", label: "Failed Sync", description: "Alert when a connector sync fails." },
  { key: "notify_ai_opportunities", label: "AI Opportunities", description: "Notify when the AI finds a new opportunity." },
];

/** Accessible switch — control state via CSS transition (not an entrance anim). */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-brand" : "bg-white/[0.12]"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="type-body font-semibold text-foreground">{label}</p>
        <p className="type-caption text-foreground-muted">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function Field({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="type-caption text-foreground-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 type-body text-foreground outline-none transition-colors hover:border-white/[0.2] focus:border-brand/50"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-[hsl(var(--card))]">
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section variants={slideUp} className="space-y-3">
      <h2 className="px-0.5 type-eyebrow text-foreground-muted">{label}</h2>
      <div className="card p-4">{children}</div>
    </motion.section>
  );
}

export function WorkspaceSettings() {
  const reduce = useReducedMotion();
  const [values, setValues] = useState<WorkspaceSettingsValues | null>(null);
  const [saved, setSaved] = useState<WorkspaceSettingsValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/workspace/settings")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then((data) => {
        if (cancelled) return;
        setValues(data.settings as WorkspaceSettingsValues);
        setSaved(data.settings as WorkspaceSettingsValues);
      })
      .catch(() => !cancelled && setError("Couldn't load settings."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(saved),
    [values, saved]
  );

  const set = useCallback(
    <K extends keyof WorkspaceSettingsValues>(
      key: K,
      v: WorkspaceSettingsValues[K]
    ) => {
      setValues((prev) => (prev ? { ...prev, [key]: v } : prev));
      setJustSaved(false);
    },
    []
  );

  const save = useCallback(async () => {
    if (!values || saving || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("save failed");
      const data = (await res.json()) as { settings: WorkspaceSettingsValues };
      setValues(data.settings);
      setSaved(data.settings);
      setJustSaved(true);
    } catch {
      setError("Couldn't save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [values, saving, dirty]);

  if (loading || !values) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 0].map((_, i) => (
          <div key={i} className="card h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerChildren}
      initial={reduce ? false : "hidden"}
      animate="visible"
    >
      <Section label="Feature Flags">
        <div className="divide-y divide-white/[0.06]">
          {FEATURE_FLAGS.map((f) => (
            <ToggleRow
              key={f.key}
              label={f.label}
              description={f.description}
              checked={values[f.key]}
              onChange={(v) => set(f.key, v)}
            />
          ))}
        </div>
      </Section>

      <Section label="Workspace Preferences">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field
            label="Timezone"
            value={values.timezone}
            options={TIMEZONES}
            onChange={(v) => set("timezone", v)}
          />
          <Field
            label="Currency"
            value={values.currency}
            options={CURRENCIES}
            onChange={(v) => set("currency", v)}
          />
          <Field
            label="Date Format"
            value={values.date_format}
            options={DATE_FORMATS}
            onChange={(v) => set("date_format", v as DateFormat)}
          />
        </div>
      </Section>

      <Section label="Notification Preferences">
        <div className="divide-y divide-white/[0.06]">
          {NOTIFICATIONS.map((n) => (
            <ToggleRow
              key={n.key}
              label={n.label}
              description={n.description}
              checked={values[n.key]}
              onChange={(v) => set(n.key, v)}
            />
          ))}
        </div>
      </Section>

      <Section label="Environment">
        <div className="flex gap-2">
          {(
            [
              { id: "production", label: "Production", icon: Rocket },
              { id: "sandbox", label: "Sandbox", icon: FlaskConical },
            ] as { id: Environment; label: string; icon: typeof Rocket }[]
          ).map((env) => {
            const active = values.environment === env.id;
            const Icon = env.icon;
            return (
              <button
                key={env.id}
                type="button"
                aria-pressed={active}
                onClick={() => set("environment", env.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 type-body font-semibold transition-colors",
                  active
                    ? "border-brand/40 bg-brand/15 text-brand"
                    : "border-white/[0.1] bg-white/[0.03] text-foreground-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {env.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 type-caption text-foreground-muted">
          Sandbox is a workspace preference for safe testing — it does not change
          live connector or execution behaviour.
        </p>
      </Section>

      {/* Save bar */}
      <motion.div
        variants={slideUp}
        className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-white/[0.07] bg-background py-3"
      >
        <span className="type-caption text-foreground-muted">
          {error ? (
            <span className="text-red-400/80">{error}</span>
          ) : justSaved && !dirty ? (
            <span className="inline-flex items-center gap-1 text-brand">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          ) : dirty ? (
            "Unsaved changes"
          ) : (
            "All changes saved"
          )}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 type-caption font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save changes
        </button>
      </motion.div>
    </motion.div>
  );
}
