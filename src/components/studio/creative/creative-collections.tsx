"use client";

/**
 * Production Creative Browser — CreativeCollections (Sprint 63).
 * A horizontal rail of collections with counts. Reusable; clicking focuses the
 * collections filter. Token-based; keyboard + focus.
 */

import { FolderOpen } from "lucide-react";
import { useCreativeBrowser } from "./creative-context";
import { COLLECTIONS } from "./creative-data";

export function CreativeCollections() {
  const { setFilter } = useCreativeBrowser();
  return (
    <div className="studio-scroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      {COLLECTIONS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => setFilter("collections")}
          className="studio-card studio-card-interactive studio-focusable flex shrink-0 items-center gap-2.5 p-3 text-left"
        >
          <div className="studio-tile flex h-9 w-9 items-center justify-center text-foreground-muted">
            <FolderOpen className="h-4 w-4" />
          </div>
          <div>
            <p className="type-body font-semibold text-foreground">{c.label}</p>
            <p className="type-caption text-foreground-muted">{c.count} assets</p>
          </div>
        </button>
      ))}
    </div>
  );
}
