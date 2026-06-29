import { NextResponse } from "next/server";
import { isObservabilityAuthorized, getWorkerStatus } from "@/lib/observability";

export const dynamic = "force-dynamic";

/** Read-only worker health: running state, uptime, Redis, version, startedAt. */
export async function GET(request: Request) {
  if (!isObservabilityAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getWorkerStatus());
}
