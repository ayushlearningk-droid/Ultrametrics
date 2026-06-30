"use client";

/**
 * Production Asset Inspector — InspectorNotes (Sprint 63).
 * A local notes field (no persistence) with future comments / AI-suggest seams.
 */

import { useState } from "react";
import { StickyNote, Sparkles, MessageSquarePlus } from "lucide-react";
import { InspectorSection } from "./inspector-section";

export function InspectorNotes() {
  const [notes, setNotes] = useState("");
  return (
    <InspectorSection
      icon={<StickyNote className="h-3.5 w-3.5 text-brand" />}
      title="Notes"
      action={
        <button
          type="button"
          aria-disabled
          title="AI suggestions (coming soon)"
          aria-label="AI suggestions (coming soon)"
          className="studio-focusable flex h-5 w-5 cursor-default items-center justify-center rounded-[var(--studio-radius-sm)] text-foreground-muted/70 hover:text-foreground"
        >
          <Sparkles className="h-3 w-3" />
        </button>
      }
    >
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder="Add a note for the team…"
        className="studio-glass studio-focusable w-full resize-none bg-transparent px-3 py-2 type-caption text-foreground outline-none placeholder:text-foreground-muted"
      />
      <button
        type="button"
        aria-disabled
        title="Comments (coming soon)"
        className="studio-focusable flex w-fit cursor-default items-center gap-1.5 type-caption text-foreground-muted/70 hover:text-foreground"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" /> Add comment
      </button>
    </InspectorSection>
  );
}
