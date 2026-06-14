import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentWorkspaceId, getUserWorkspaces } from "@/lib/data/workspaces";

type ScheduleFrequency = "hourly" | "daily" | "weekly";

type SaveScheduleBody = {
  frequency?: string;
  enabled?: boolean;
};

const ALLOWED_FREQUENCIES: ScheduleFrequency[] = ["hourly", "daily", "weekly"];

function getNextRunAt(frequency: ScheduleFrequency, base = new Date()): string {
  const next = new Date(base);

  if (frequency === "hourly") {
    next.setHours(next.getHours() + 1);
  } else if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
  } else {
    next.setDate(next.getDate() + 7);
  }

  return next.toISOString();
}

export async function GET(request: Request) {
  const user = await requireUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);

  if (!workspaceId) {
    return NextResponse.json(
      { error: "No active workspace found" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("workspace_sync_schedules")
    .select("workspace_id, frequency, enabled, next_run_at, updated_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    schedule: data ?? null,
  });
}

export async function POST(request: Request) {
  const user = await requireUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const body = (await request.json().catch(() => ({}))) as SaveScheduleBody;
  const frequency = (body.frequency ?? "").toLowerCase();
  const enabled = body.enabled ?? true;

  if (!ALLOWED_FREQUENCIES.includes(frequency as ScheduleFrequency)) {
    return NextResponse.json(
      { error: "Invalid frequency. Use hourly, daily, or weekly." },
      { status: 400 }
    );
  }

  const workspaces = await getUserWorkspaces();
  const workspaceId = await getCurrentWorkspaceId(workspaces);

  if (!workspaceId) {
    return NextResponse.json(
      { error: "No active workspace found" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("workspace_sync_schedules")
    .upsert(
      {
        workspace_id: workspaceId,
        frequency,
        enabled,
        next_run_at: enabled ? getNextRunAt(frequency as ScheduleFrequency) : null,
        last_saved_by: user.id,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "workspace_id",
      }
    )
    .select("workspace_id, frequency, enabled, next_run_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    schedule: data,
  });
}
