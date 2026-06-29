import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueSyncJob } from "@/lib/queue/producers";

type ScheduleFrequency = "hourly" | "daily" | "weekly";

type WorkspaceSchedule = {
  workspace_id: string;
  frequency: ScheduleFrequency;
  enabled: boolean;
  next_run_at: string | null;
};

function addScheduleInterval(base: Date, frequency: ScheduleFrequency): Date {
  const next = new Date(base);

  if (frequency === "hourly") {
    next.setHours(next.getHours() + 1);
    return next;
  }

  if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
    return next;
  }

  next.setDate(next.getDate() + 7);
  return next;
}

function isDue(schedule: WorkspaceSchedule, now: Date): boolean {
  if (!schedule.enabled) {
    return false;
  }

  if (!schedule.next_run_at) {
    return true;
  }

  return new Date(schedule.next_run_at).getTime() <= now.getTime();
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data, error } = await admin
    .from("workspace_sync_schedules")
    .select("workspace_id, frequency, enabled, next_run_at")
    .eq("enabled", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const schedules = (data ?? []) as WorkspaceSchedule[];
  const dueSchedules = schedules.filter((schedule) => isDue(schedule, now));

  // Cron is now a PRODUCER (Sprint 56F): it enqueues one workspace-wide sync job
  // per due schedule instead of running the sync pipeline inline. A worker
  // invokes the existing pipeline. next_run_at is advanced here at enqueue time,
  // preserving the prior behavior of advancing the schedule regardless of the
  // sync's eventual outcome. `requestedAt` is pinned to the scan time so the
  // deterministic idempotency key dedupes re-enqueues of the same run.
  const requestedAt = now.toISOString();

  const enqueued: Array<{
    workspaceId: string;
    jobId: string;
    frequency: ScheduleFrequency;
  }> = [];

  for (const schedule of dueSchedules) {
    const job = await enqueueSyncJob(
      { workspaceId: schedule.workspace_id, requestedAt },
      { createdAt: requestedAt }
    );

    const nextRunAt = addScheduleInterval(now, schedule.frequency).toISOString();

    await admin
      .from("workspace_sync_schedules")
      .update({
        next_run_at: nextRunAt,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", schedule.workspace_id);

    enqueued.push({
      workspaceId: schedule.workspace_id,
      jobId: job.data.jobId,
      frequency: schedule.frequency,
    });
  }

  return NextResponse.json({
    ok: true,
    scanned: schedules.length,
    triggered: dueSchedules.length,
    enqueued,
  });
}
