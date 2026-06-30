"use client";

/**
 * Production Asset Inspector — selection state (Sprint 63).
 *
 * Holds the inspected asset id (reuses the Creative Browser data source). A
 * future sprint can drive `selectedId` from a shared workspace selection without
 * changing any inspector component.
 */

import { createContext, useContext, useMemo, useState } from "react";
import { SAMPLE_CREATIVES, type CreativeItem } from "@/components/studio/creative/creative-data";

interface InspectorValue {
  items: CreativeItem[];
  selectedId: string | null;
  asset: CreativeItem | null;
  setSelectedId: (id: string | null) => void;
  loading: boolean;
}

const InspectorContext = createContext<InspectorValue | null>(null);

export function InspectorProvider({
  initialId = SAMPLE_CREATIVES[0]?.id ?? null,
  source = SAMPLE_CREATIVES,
  loading = false,
  children,
}: {
  initialId?: string | null;
  source?: CreativeItem[];
  loading?: boolean;
  children: React.ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initialId);

  const value = useMemo<InspectorValue>(() => {
    const asset = selectedId ? source.find((c) => c.id === selectedId) ?? null : null;
    return { items: source, selectedId, asset, setSelectedId, loading };
  }, [source, selectedId, loading]);

  return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>;
}

export function useInspector(): InspectorValue {
  const ctx = useContext(InspectorContext);
  if (!ctx) throw new Error("useInspector must be used within an InspectorProvider");
  return ctx;
}
