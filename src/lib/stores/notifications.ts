"use client";

/**
 * Notifications — client store (Sprint 22).
 *
 * Module-level store (useSyncExternalStore) mirroring /api/notifications, with
 * per-user READ and DISMISSED state persisted to localStorage (no DB). Shared
 * reactively across the bell badge and the Notification Center drawer. Mirrors
 * the action-queue store pattern. Read-only feed — never writes notifications.
 */

import { useSyncExternalStore } from "react";

export type NotifCategory = "ai" | "sync" | "actions" | "reports" | "workspace";
export type NotifType = "success" | "failed" | "warning" | "info";

export interface AppNotification {
  id: string;
  category: NotifCategory;
  type: NotifType;
  title: string;
  description?: string;
  provider?: string;
  createdAt: string;
  cta?: { label: string; href: string };
}

const READ_KEY = "um:notif:read:v1";
const DISMISSED_KEY = "um:notif:dismissed:v1";

let items: AppNotification[] = [];
let readIds = new Set<string>();
let dismissedIds = new Set<string>();
let loaded = false;
let stateLoaded = false;

interface Snapshot {
  visible: AppNotification[];
  readIds: ReadonlySet<string>;
  unreadCount: number;
  loaded: boolean;
}

const EMPTY: Snapshot = {
  visible: [],
  readIds: new Set(),
  unreadCount: 0,
  loaded: false,
};
let snapshot: Snapshot = EMPTY;

const listeners = new Set<() => void>();

function readStored(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr)
      ? (arr.filter((x) => typeof x === "string") as string[])
      : [];
  } catch {
    return [];
  }
}

function persist(key: string, set: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

function loadState(): void {
  if (stateLoaded || typeof window === "undefined") return;
  readIds = new Set(readStored(READ_KEY));
  dismissedIds = new Set(readStored(DISMISSED_KEY));
  stateLoaded = true;
}

function rebuild(): void {
  const visible = items.filter((n) => !dismissedIds.has(n.id));
  const unreadCount = visible.filter((n) => !readIds.has(n.id)).length;
  snapshot = { visible, readIds: new Set(readIds), unreadCount, loaded };
}

function emit(): void {
  rebuild();
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot(): Snapshot {
  return snapshot;
}

function getServerSnapshot(): Snapshot {
  return EMPTY;
}

/** Fetch the feed from the server and merge with persisted read/dismissed state. */
export async function hydrateNotifications(): Promise<void> {
  if (typeof window === "undefined") return;
  loadState();
  try {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = (await res.json()) as { notifications?: AppNotification[] };
      items = data.notifications ?? [];
    }
  } catch {
    /* keep whatever we have */
  } finally {
    loaded = true;
    emit();
  }
}

export function markRead(id: string): void {
  loadState();
  if (!readIds.has(id)) {
    readIds.add(id);
    persist(READ_KEY, readIds);
    emit();
  }
}

export function markAllRead(): void {
  loadState();
  let changed = false;
  for (const n of items) {
    if (!dismissedIds.has(n.id) && !readIds.has(n.id)) {
      readIds.add(n.id);
      changed = true;
    }
  }
  if (changed) {
    persist(READ_KEY, readIds);
    emit();
  }
}

/** Dismiss every already-read notification from the visible list. */
export function clearRead(): void {
  loadState();
  let changed = false;
  for (const n of items) {
    if (readIds.has(n.id) && !dismissedIds.has(n.id)) {
      dismissedIds.add(n.id);
      changed = true;
    }
  }
  if (changed) {
    persist(DISMISSED_KEY, dismissedIds);
    emit();
  }
}

export function useNotifications(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
