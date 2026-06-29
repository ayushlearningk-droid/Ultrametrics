/**
 * Queue job processors (Sprint 56C — Worker Runtime).
 *
 * One processor per queue. SCOPE: log-only. A processor receives a job and logs
 * that it was received — it executes NO business logic. There is deliberately no
 * Meta/Google/AI call, no Action Engine, no Generation, no Scheduler here. The
 * real handlers arrive in later sprints; this proves the consume + log loop.
 *
 * A processor that resolves marks the job completed; one that throws marks it
 * failed (and BullMQ applies the producer's retry policy). These no-op
 * processors always resolve.
 */

import type { Job } from "bullmq";
import type { JobEnvelope, QueueName } from "./types";
import { runMetaToGoogleSheetsSyncForWorkspace } from "@/lib/sync/meta-to-google-sheets";
import { runGoogleAdsToGoogleSheetsSyncForWorkspace } from "@/lib/sync/google-ads-to-google-sheets";

/** Structured log line for a processed job (no secrets — metadata only). */
function describe<Q extends QueueName>(queue: Q, job: Job<JobEnvelope<Q>>) {
  const { jobId, workspaceId, idempotencyKey, priority, createdAt } = job.data;
  return {
    queue,
    bullmqId: job.id,
    jobId,
    workspaceId,
    idempotencyKey,
    priority,
    createdAt,
    attemptsMade: job.attemptsMade,
  };
}

/**
 * Build a log-only processor for a queue. Logs "job received" and returns. No
 * business logic runs. Returns void (no result payload) by design.
 */
function makeProcessor<Q extends QueueName>(queue: Q) {
  return async function process(job: Job<JobEnvelope<Q>>): Promise<void> {
    console.info(`[worker:${queue}] job received`, describe(queue, job));
    // No-op: consume and log only. Resolve so the job is marked completed.
  };
}

/**
 * Sync processor (Sprint 56F — Cron → Queue migration).
 *
 * Invokes the EXISTING sync pipeline unchanged — one workspace-wide run across
 * every provider, exactly as the cron used to call it. We do not re-implement or
 * modify the sync engine / Meta / Google connectors; we only call them.
 *
 * Failure handling preserves the 56D retry policy: if either provider sync
 * returns a non-ok result, we throw so BullMQ retries per the sync queue's
 * policy and ultimately dead-letters. The sync functions keep their own internal
 * audit logging — nothing here adds, removes, or duplicates it.
 */
async function syncProcessor(job: Job<JobEnvelope<"sync">>): Promise<void> {
  console.info("[worker:sync] job received", describe("sync", job));
  const { workspaceId } = job.data;

  const [meta, googleAds] = await Promise.all([
    runMetaToGoogleSheetsSyncForWorkspace(workspaceId),
    runGoogleAdsToGoogleSheetsSyncForWorkspace(workspaceId),
  ]);

  console.info("[worker:sync] sync pipeline finished", {
    workspaceId,
    meta: { ok: meta.ok, status: meta.status },
    googleAds: { ok: googleAds.ok, status: googleAds.status },
  });

  const failures: string[] = [];
  if (!meta.ok) failures.push(`meta(${meta.status}): ${meta.error}`);
  if (!googleAds.ok)
    failures.push(`google_ads(${googleAds.status}): ${googleAds.error}`);

  if (failures.length > 0) {
    // Throw → BullMQ applies the sync queue's retry policy, then DLQ.
    throw new Error(
      `sync failed for workspace ${workspaceId}: ${failures.join("; ")}`
    );
  }
}

/** Processor for each queue, keyed by name. */
export const PROCESSORS = {
  sync: syncProcessor,
  "action-exec": makeProcessor("action-exec"),
  generation: makeProcessor("generation"),
} as const;

/** The processor function type for a given queue. */
export type Processor<Q extends QueueName> = (
  job: Job<JobEnvelope<Q>>
) => Promise<void>;
