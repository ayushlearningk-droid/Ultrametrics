/**
 * Ask Ultrametrics — AI title generation route (P1).
 *
 * POST /api/ai/conversations/[id]/title  body: { userMessage: string }
 *
 * Best-effort, async title generation fired by the client after the first AI
 * response completes. Generates a concise executive-style title from the first
 * user message and stores it — but ONLY while the conversation still carries an
 * auto placeholder (`title_generated = true`). A manual rename (which sets
 * `title_generated = false`) locks the title; the atomic compare-and-set below
 * guarantees a rename is never clobbered, even mid-generation.
 *
 * Authorization is delegated to RLS: getConversation / update only resolve rows
 * the authenticated user owns. Non-visible rows read back as null → 404.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { createClient } from "@/lib/supabase/server";
import { getConversation } from "@/lib/data/conversations";
import { generateConversationTitle } from "@/lib/ai/generate-title";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: { userMessage?: unknown } = {};
  try {
    body = (await request.json()) as { userMessage?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const userMessage =
    typeof body.userMessage === "string" ? body.userMessage : "";
  if (!userMessage.trim()) {
    return NextResponse.json({ error: "userMessage required" }, { status: 400 });
  }

  // Load (RLS-scoped). 404 when not visible.
  const conversation = await getConversation(id);
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }
  // Pre-gate: only auto-title a replaceable placeholder. Skipping here also
  // avoids an LLM call when the title is already locked (manual or AI-final).
  if (!conversation.title_generated) {
    return NextResponse.json({ skipped: true, reason: "title locked" });
  }

  const title = await generateConversationTitle(userMessage);
  if (!title) {
    return NextResponse.json({ skipped: true, reason: "no title generated" });
  }

  // Atomic compare-and-set: write only if STILL a replaceable placeholder, so a
  // manual rename that happened during generation is never overwritten.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .update({ title, title_generated: false })
    .eq("id", id)
    .eq("title_generated", true)
    .select("*")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    // Lost the race (locked mid-generation) — do not clobber.
    return NextResponse.json({
      skipped: true,
      reason: "locked during generation",
    });
  }
  return NextResponse.json({ conversation: data });
}
