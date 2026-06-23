/**
 * Ask Ultrametrics — single conversation route (U1 Phase 1).
 *
 * GET    /api/ai/conversations/[id]  → { conversation, messages }
 * PATCH  /api/ai/conversations/[id]  → rename / archive { title?, archived? }
 * DELETE /api/ai/conversations/[id]  → delete (messages cascade)
 *
 * Authorization is delegated to RLS: getConversation/update/delete only resolve
 * rows the authenticated user owns in a workspace they belong to. A row that
 * isn't visible reads back as null → 404.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import {
  getConversation,
  getMessages,
  updateConversation,
  deleteConversation,
} from "@/lib/data/conversations";

export const runtime = "nodejs";

const TITLE_MAX = 200;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const conversation = await getConversation(id);
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }
  const messages = await getMessages(id);
  return NextResponse.json({ conversation, messages });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: { title?: unknown; archived?: unknown; pinned?: unknown } = {};
  try {
    body = (await request.json()) as {
      title?: unknown;
      archived?: unknown;
      pinned?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: {
    title?: string;
    titleGenerated?: boolean;
    archived?: boolean;
    pinned?: boolean;
  } = {};
  if (typeof body.title === "string" && body.title.trim()) {
    patch.title = body.title.trim().slice(0, TITLE_MAX);
    // A manual rename is authoritative — clear the auto-generated flag.
    patch.titleGenerated = false;
  }
  if (typeof body.archived === "boolean") {
    patch.archived = body.archived;
  }
  // Sprint 5: pin / unpin.
  if (typeof body.pinned === "boolean") {
    patch.pinned = body.pinned;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Nothing to update (title, archived, or pinned required)" },
      { status: 400 }
    );
  }

  const conversation = await updateConversation(id, patch);
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ conversation });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  // Existence/ownership is enforced by RLS; deleting a non-visible row is a
  // no-op, which we report as success (idempotent).
  await deleteConversation(id);
  return NextResponse.json({ ok: true });
}
