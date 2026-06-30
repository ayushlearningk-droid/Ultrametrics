"use client";

/**
 * Production Creative Browser — CreativeGrid (Sprint 63).
 *
 * Renders the filtered creatives as a grid or list, with loading skeletons and a
 * premium empty state. The trailing sentinel + data-virtualize hook are future
 * seams for infinite scroll / virtualization (no logic this sprint).
 */

import { ImageOff } from "lucide-react";
import { useCreativeBrowser } from "./creative-context";
import { CreativeCard } from "./creative-card";
import { CreativeRow } from "./creative-row";

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="studio-card overflow-hidden">
          <div className="studio-skeleton aspect-video w-full" />
          <div className="flex flex-col gap-2 p-3">
            <span className="studio-skeleton h-4 w-2/3 rounded" />
            <span className="studio-skeleton h-3 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="studio-card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="studio-tile flex h-12 w-12 items-center justify-center text-foreground-muted">
        <ImageOff className="h-5 w-5" />
      </div>
      <p className="type-body font-semibold text-foreground">No creatives match</p>
      <p className="type-caption text-foreground-muted">Try a different filter or clear your search.</p>
    </div>
  );
}

export function CreativeGrid() {
  const { items, view, loading } = useCreativeBrowser();

  if (loading) return <GridSkeleton />;
  if (items.length === 0) return <EmptyState />;

  return (
    <div data-virtualize="false">
      {view === "list" ? (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <CreativeRow key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <CreativeCard key={item.id} item={item} />
          ))}
        </div>
      )}
      {/* Future infinite-scroll sentinel (observed by a later sprint). */}
      <div data-infinite-scroll-sentinel aria-hidden />
    </div>
  );
}
