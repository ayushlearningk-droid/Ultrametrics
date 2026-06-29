/**
 * Typed queue accessors (Sprint 56A — Roadmap 8.0).
 *
 * Thin, named wrappers over the registry so callers reference a queue by a
 * stable function instead of a magic string. Each returns the shared BullMQ
 * Queue handle (created lazily) with its payload type bound from types.ts.
 *
 * SCOPE (Sprint 56A): accessors only — no jobs are added here.
 */

import { getQueue } from "./registry";
import type { Queue } from "bullmq";
import type { QueuePayload } from "./types";

/** Connector data-sync queue. */
export function syncQueue(): Queue<QueuePayload<"sync">> {
  return getQueue("sync");
}

/** Action Engine execution queue. */
export function actionExecQueue(): Queue<QueuePayload<"action-exec">> {
  return getQueue("action-exec");
}

/** AI generation queue. */
export function generationQueue(): Queue<QueuePayload<"generation">> {
  return getQueue("generation");
}
