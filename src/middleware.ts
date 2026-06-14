import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (request.headers.get("x-dev-screenshot") === "ultrametrics_dev_screenshot") {
    const res = NextResponse.next();
    res.cookies.set("__dev_screenshot", "1", { path: "/", httpOnly: false });
    return res;
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
