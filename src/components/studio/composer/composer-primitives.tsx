"use client";

/**
 * Production Prompt Composer — reusable primitives (Sprint 63).
 *
 * The building blocks every selector composes from — no duplicated control UI.
 * Each supports loading · disabled · error · empty · keyboard · focus, and
 * exposes inert future seams (AI autofill · voice · drag) so later sprints wire
 * them without changing the control. Studio 2.0 tokens; reduced-motion safe.
 */

import type { ReactNode } from "react";
import { Sparkles, Mic, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FieldSeams {
  /** Future AI autofill affordance (inert). */
  ai?: boolean;
  /** Future voice input affordance (inert). */
  voice?: boolean;
  /** Future drag handle (inert). */
  drag?: boolean;
}

/** A grouped inspector section (Final Cut / Linear inspector feel). */
export function ComposerSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="studio-card flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-0.5">
        <h3 className="type-eyebrow text-foreground-muted">{title}</h3>
        {description && <p className="type-caption text-foreground-muted">{description}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

/** A labelled field with header seams + error/help. */
export function ComposerField({
  label,
  error,
  help,
  seams,
  children,
}: {
  label: string;
  error?: string;
  help?: string;
  seams?: FieldSeams;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5" data-composer-field>
      <div className="flex items-center gap-1.5">
        {seams?.drag && (
          <span aria-hidden className="cursor-grab text-foreground-muted/50" title="Drag (coming soon)">
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="flex-1 type-caption font-semibold text-foreground/90">{label}</span>
        {seams?.ai && <SeamButton icon={Sparkles} label="AI autofill" />}
        {seams?.voice && <SeamButton icon={Mic} label="Voice input" />}
      </div>
      {children}
      {error ? (
        <span className="type-caption text-red-400/80">{error}</span>
      ) : help ? (
        <span className="type-caption text-foreground-muted">{help}</span>
      ) : null}
    </div>
  );
}

function SeamButton({ icon: Icon, label }: { icon: typeof Sparkles; label: string }) {
  return (
    <button
      type="button"
      aria-disabled
      title={`${label} (coming soon)`}
      aria-label={`${label} (coming soon)`}
      className="studio-focusable flex h-5 w-5 cursor-default items-center justify-center rounded-[var(--studio-radius-sm)] text-foreground-muted/60 transition-colors hover:text-foreground"
    >
      <Icon className="h-3 w-3" />
    </button>
  );
}

/* ── Chip select (single-choice) ─────────────────────────────────────────── */
export interface ChipOpt<T extends string> {
  id: T;
  label: string;
}

export function ChipSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  loading,
  disabled,
  error,
  emptyLabel = "No options",
  seams,
}: {
  label: string;
  options: ChipOpt<T>[];
  value?: T;
  onChange: (id: T) => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  emptyLabel?: string;
  seams?: FieldSeams;
}) {
  return (
    <ComposerField label={label} error={error} seams={seams}>
      {loading ? (
        <div className="flex flex-wrap gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="studio-skeleton h-7 w-20 rounded-full" />
          ))}
        </div>
      ) : options.length === 0 ? (
        <span className="type-caption text-foreground-muted">{emptyLabel}</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => {
            const active = value === o.id;
            return (
              <button
                key={o.id}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => onChange(o.id)}
                className={cn(
                  "studio-focusable rounded-full border px-2.5 py-1 type-caption transition-colors",
                  active
                    ? "border-brand/40 bg-brand/10 text-brand"
                    : "border-white/[0.08] text-foreground-muted hover:bg-white/[0.05] hover:text-foreground",
                  disabled && "cursor-default opacity-50"
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </ComposerField>
  );
}

/* ── Text + number inputs ────────────────────────────────────────────────── */
export function ComposerTextInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  error,
  seams,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  seams?: FieldSeams;
}) {
  return (
    <ComposerField label={label} error={error} seams={seams}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="studio-glass studio-focusable w-full bg-transparent px-3 py-2 type-body text-foreground outline-none placeholder:text-foreground-muted disabled:opacity-50"
      />
    </ComposerField>
  );
}

export function ComposerNumberInput({
  label,
  value,
  onChange,
  prefix,
  disabled,
  error,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <ComposerField label={label} error={error}>
      <div className="studio-glass flex items-center gap-1.5 px-3 py-2">
        {prefix && <span className="type-caption text-foreground-muted">{prefix}</span>}
        <input
          type="number"
          inputMode="numeric"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="studio-focusable w-full bg-transparent type-body tabular-nums text-foreground outline-none disabled:opacity-50"
        />
      </div>
    </ComposerField>
  );
}
