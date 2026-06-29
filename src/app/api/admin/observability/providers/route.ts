import { NextResponse } from "next/server";
import { isObservabilityAuthorized, getProviderHealth } from "@/lib/observability";

export const dynamic = "force-dynamic";

/** Read-only provider health (config-presence only — no provider is executed). */
export async function GET(request: Request) {
  if (!isObservabilityAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getProviderHealth());
}
