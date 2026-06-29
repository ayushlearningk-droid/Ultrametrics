import { NextResponse } from "next/server";
import {
  isObservabilityAuthorized,
  getObservabilitySnapshot,
} from "@/lib/observability";

export const dynamic = "force-dynamic";

/** Aggregate read-only snapshot of the whole observability surface. */
export async function GET(request: Request) {
  if (!isObservabilityAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const snapshot = await getObservabilitySnapshot();
  return NextResponse.json(snapshot);
}
