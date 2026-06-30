"use client";

/**
 * Workspace Memory — editable AI Memory Panel (Sprint 63S).
 *
 * Operator-editable preferences the next Generate Campaign inherits. Reads/writes
 * the Workspace Memory context; presentation state only. Reuses Studio tokens; no
 * new component primitives.
 */

import { Brain } from "lucide-react";
import { MEMORY_FIELDS, useWorkspaceMemory } from "./workspace-memory-context";

export function MemoryPanel() {
  const { memory, setField } = useWorkspaceMemory();
  return (
    <div className="studio-card flex flex-col gap-3 p-4">
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
          <Brain className="h-3.5 w-3.5 text-brand" />
          AI Memory
        </span>
        <span className="chip chip-emerald">Inherited by every campaign</span>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MEMORY_FIELDS.map(({ key, label, multiline }) => (
          <label key={key} className="flex flex-col gap-1.5">
            <span className="type-caption text-foreground-muted">{label}</span>
            {multiline ? (
              <textarea
                value={memory[key]}
                onChange={(e) => setField(key, e.target.value)}
                rows={2}
                className="studio-focusable resize-none rounded-[var(--studio-radius-md)] border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 type-caption text-foreground placeholder:text-foreground-muted/60"
              />
            ) : (
              <input
                value={memory[key]}
                onChange={(e) => setField(key, e.target.value)}
                className="studio-focusable rounded-[var(--studio-radius-md)] border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 type-caption text-foreground placeholder:text-foreground-muted/60"
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
