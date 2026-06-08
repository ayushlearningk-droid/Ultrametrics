import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runMetaToGoogleSheetsSyncForWorkspace } from "@/lib/sync/meta-to-google-sheets";

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

  const results: Array<{
    workspaceId: string;
    ok: boolean;
    status: number;
    error?: string;
  }> = [];

  for (const schedule of dueSchedules) {
    const result = await runMetaToGoogleSheetsSyncForWorkspace(
      schedule.workspace_id
    );

    const nextRunAt = addScheduleInterval(now, schedule.frequency).toISOString();

    await admin
      .from("workspace_sync_schedules")
      .update({
        next_run_at: nextRunAt,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", schedule.workspace_id);

    results.push({
      workspaceId: schedule.workspace_id,
      ok: result.ok,
      status: result.status,
      error: result.ok ? undefined : result.error,
    });
  }

  return NextResponse.json({
    ok: true,
    scanned: schedules.length,
    triggered: dueSchedules.length,
    results,
  });
}
