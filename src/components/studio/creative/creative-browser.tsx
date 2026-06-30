"use client";

/**
 * Production Creative Browser (Sprint 63).
 *
 * The Creative Intelligence Browser — not a gallery. Composes the reusable
 * pieces (search · filters · sort · view · collections · grid/list · quick
 * preview) over the browser state, reusing the production media components,
 * employees registry, and Forecast Foundation. Plugs into the Unified Workspace
 * as a region. Presentation only.
 */

import { Images } from "lucide-react";
import { CreativeBrowserProvider, useCreativeBrowser } from "./creative-context";
import { CreativeSearch, CreativeFilters, CreativeSort, CreativeViewToggle } from "./creative-toolbar";
import { CreativeCollections } from "./creative-collections";
import { CreativeGrid } from "./creative-grid";
import { CreativeQuickPreview } from "./creative-quick-preview";
import type { CreativeItem } from "./creative-data";

function Body() {
  const { filter } = useCreativeBrowser();
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-1 py-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
            <Images className="h-3.5 w-3.5 text-brand" />
            Creative Intelligence
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Creative Browser</h2>
        </div>
        <CreativeViewToggle />
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[200px] flex-1">
          <CreativeSearch />
        </div>
        <CreativeSort />
      </div>

      <CreativeFilters />

      {filter === "collections" && <CreativeCollections />}

      <CreativeGrid />
      <CreativeQuickPreview />
    </div>
  );
}

export function CreativeBrowser({ source, loading }: { source?: CreativeItem[]; loading?: boolean }) {
  return (
    <CreativeBrowserProvider source={source} loading={loading}>
      <Body />
    </CreativeBrowserProvider>
  );
}
