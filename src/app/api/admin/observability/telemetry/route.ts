import { NextResponse } from "next/server";
import { isObservabilityAuthorized, getTelemetry } from "@/lib/observability";

export const dynamic = "force-dynamic";

/** Read-only telemetry: avg processing time, throughput, success/failure, retries. */
export async function GET(request: Request) {
  if (!isObservabilityAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getTelemetry());
}
