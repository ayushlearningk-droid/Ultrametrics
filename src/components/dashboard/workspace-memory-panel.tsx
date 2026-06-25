"use client";

/**
 * Workspace Memory panel (Sprint 31).
 *
 * Settings surface to view / add / delete durable AI-grounding notes for the
 * workspace. The AI reads these on every turn and can also add them via the
 * remember tool (those appear here marked "AI"). Design tokens only.
 */

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface MemoryRow {
  id: string;
  content: string;
  source: "user" | "ai";
  created_at: string;
}

const MAX_LEN = 500;

export function WorkspaceMemoryPanel() {
  const [items, setItems] = useState<MemoryRow[] | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/memory");
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { memories: MemoryRow[] };
      setItems(data.memories ?? []);
    } catch {
      setError("Couldn't load memory.");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(async () => {
    const content = draft.trim();
    if (!content || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("save failed");
      setDraft("");
      await load();
    } catch {
      setError("Couldn't save the note.");
    } finally {
      setSaving(false);
    }
  }, [draft, saving, load]);

  const remove = useCallback(
    async (id: string) => {
      setItems((prev) => prev?.filter((m) => m.id !== id) ?? prev);
      try {
        await fetch(`/api/workspace/memory/${id}`, { method: "DELETE" });
      } catch {
        void load(); // restore on failure
      }
    },
    [load]
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-brand" />
        <h2 className="type-body font-semibold text-foreground">AI Memory</h2>
      </div>
      <p className="type-caption text-foreground-muted">
        Durable notes the assistant remembers across chats — preferences, goals,
        and rules (e.g. &ldquo;target ROAS is 3.0&rdquo;). The AI reads these and
        can add its own when you ask it to remember something.
      </p>

      <div className="card p-4">
        {/* Add */}
        <div className="flex items-center gap-2">
          <input
            value={draft}
            maxLength={MAX_LEN}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void add();
              }
            }}
            placeholder="Add a note the AI should remember…"
            aria-label="New memory note"
            className="flex-1 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 type-body text-foreground outline-none transition-colors focus:border-brand/50"
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim() || saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand/15 px-3 py-2 type-caption font-semibold text-brand transition-colors hover:bg-brand/25 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add
          </button>
        </div>

        {error && (
          <p className="mt-2 type-caption text-red-400/80">{error}</p>
        )}

        {/* List */}
        <div className="mt-3">
          {items === null ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="card-muted h-10 animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-4 text-center type-caption text-foreground-muted">
              No notes yet — anything you add here grounds future answers.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/[0.06]">
              {items.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="type-body text-foreground/90">{m.content}</p>
                    <span
                      className={cn(
                        "chip mt-1",
                        m.source === "ai" ? "chip-emerald" : "chip-slate"
                      )}
                    >
                      {m.source === "ai" ? "Added by AI" : "You"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    aria-label="Delete note"
                    className="shrink-0 rounded-md p-1.5 text-foreground-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
