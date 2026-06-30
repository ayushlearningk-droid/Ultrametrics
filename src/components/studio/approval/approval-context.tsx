"use client";

/**
 * Production Approval Center — state (Sprint 63).
 *
 * Approval items + view state. Decisions (approve/reject/request-changes/
 * schedule/assign-reviewer) and comments mutate presentation state only — no
 * backend, no workflow engine. A real approval workflow plugs in later without
 * changing any component.
 */

import { createContext, useContext, useMemo, useState } from "react";
import { resolveCreative } from "@/components/studio/creative/creative-data";
import { EMPLOYEES, employeeName } from "@/components/studio/employees/employees-data";
import type { EmployeeId } from "@/components/studio/employees/types";
import {
  SAMPLE_APPROVALS,
  filterApprovals,
  searchApprovals,
  sortApprovals,
  countApprovals,
  type ApprovalItem,
  type ApprovalStatus,
} from "./approval-data";

function titleOf(creativeId: string): string {
  return resolveCreative(creativeId)?.title ?? creativeId;
}
let seq = 0;
const uid = (p: string) => `${p}-${seq++}`;

interface ApprovalValue {
  items: ApprovalItem[];
  filter: ApprovalStatus | "all";
  query: string;
  selectedId: string | null;
  loading: boolean;
  counts: Record<ApprovalStatus, number>;
  total: number;
  setFilter: (f: ApprovalStatus | "all") => void;
  setQuery: (q: string) => void;
  setSelectedId: (id: string | null) => void;
  approve: (id: string) => void;
  reject: (id: string) => void;
  requestChanges: (id: string) => void;
  schedule: (id: string) => void;
  assignReviewer: (id: string) => void;
  addComment: (id: string, text: string) => void;
  titleOf: (id: string) => string;
}

const ApprovalContext = createContext<ApprovalValue | null>(null);

export function ApprovalCenterProvider({
  source = SAMPLE_APPROVALS,
  loading = false,
  children,
}: {
  source?: ApprovalItem[];
  loading?: boolean;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<ApprovalItem[]>(source);
  const [filter, setFilter] = useState<ApprovalStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const decide = (id: string, status: ApprovalStatus, note: string) =>
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status, history: [...i.history, { id: uid("h"), at: Date.now(), text: note }] }
          : i
      )
    );

  const value = useMemo<ApprovalValue>(() => {
    const visible = sortApprovals(searchApprovals(filterApprovals(items, filter), query, titleOf));
    return {
      items: visible,
      filter,
      query,
      selectedId,
      loading,
      counts: countApprovals(items),
      total: items.length,
      setFilter,
      setQuery,
      setSelectedId,
      approve: (id) => decide(id, "approved", "Approved"),
      reject: (id) => decide(id, "rejected", "Rejected"),
      requestChanges: (id) => decide(id, "needs-changes", "Changes requested"),
      schedule: (id) => decide(id, "scheduled", "Scheduled for review"),
      assignReviewer: (id) =>
        setItems((prev) =>
          prev.map((i) => {
            if (i.id !== id) return i;
            const idx = EMPLOYEES.findIndex((e) => e.id === i.reviewerId);
            const next: EmployeeId = EMPLOYEES[(idx + 1) % EMPLOYEES.length].id;
            return { ...i, reviewerId: next, history: [...i.history, { id: uid("h"), at: Date.now(), text: `Assigned to ${employeeName(next)}` }] };
          })
        ),
      addComment: (id, text) =>
        setItems((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, comments: [...i.comments, { id: uid("c"), authorId: i.reviewerId, text, at: Date.now() }] } : i
          )
        ),
      titleOf,
    };
  }, [items, filter, query, selectedId, loading]);

  return <ApprovalContext.Provider value={value}>{children}</ApprovalContext.Provider>;
}

export function useApproval(): ApprovalValue {
  const ctx = useContext(ApprovalContext);
  if (!ctx) throw new Error("useApproval must be used within an ApprovalCenterProvider");
  return ctx;
}

export function useApprovalItem(id: string | null): ApprovalItem | null {
  const { items } = useApproval();
  if (!id) return null;
  return items.find((i) => i.id === id) ?? SAMPLE_APPROVALS.find((i) => i.id === id) ?? null;
}
