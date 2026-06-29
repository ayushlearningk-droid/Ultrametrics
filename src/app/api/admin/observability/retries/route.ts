import { NextResponse } from "next/server";
import { isObservabilityAuthorized, getRetryAnalytics } from "@/lib/observability";

export const dynamic = "force-dynamic";

/** Read-only retry analytics: retry counts, failure reasons, DLQ, top errors. */
export async function GET(request: Request) {
  if (!isObservabilityAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getRetryAnalytics());
}
