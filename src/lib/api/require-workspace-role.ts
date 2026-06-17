/**
 * Workspace RBAC helpers (RBAC Step 1).
 *
 * Single source of truth for role-based authorization. NOT yet wired into any
 * route — gating is a later step. These helpers resolve the *authenticated*
 * user themselves (never trust a caller-supplied identity) and decide whether
 * that user's role in a workspace satisfies an allowed set.
 *
 * Role precedence: workspaces.owner_id === user ⇒ "owner" (canonical, supports
 * the single-owner model); otherwise workspace_members.role; otherwise null
 * (not a member).
 *
 * Kill-switch: RBAC_ENFORCE. Defaults to ENFORCED. Only the literal string
 * "false" disables enforcement. The switch gates ROLE TIERING ONLY — it never
 * disables authentication or membership: an unauthenticated user is still 401
 * and a non-member is still 403 even when enforcement is off. When off, an
 * authenticated member with an insufficient role is allowed through but a
 * "[RBAC] would deny" warning is logged so impact can be observed before
 * flipping enforcement on.
 */

import { requireUser } from "@/lib/api/require-user";
import { createAdminClient } from "@/lib/supabase/admin";

export type WorkspaceRole = "owner" | "admin" | "member";

export type RoleCheckResult =
  | { ok: true; userId: string; role: WorkspaceRole; enforced: boolean }
  | {
      ok: false;
      status: 401 | 403 | 404;
      reason:
        | "unauthenticated"
        | "not_a_member"
        | "insufficient_role"
        | "workspace_not_found";
    };

/** Returns false only when RBAC_ENFORCE is the literal string "false". */
function rbacEnforced(): boolean {
  return process.env.RBAC_ENFORCE?.trim().toLowerCase() !== "false";
}

/**
 * Resolve a user's effective role in a workspace.
 *
 * Uses the service-role client so the authorization decision is independent of
 * RLS. The caller must pass a server-derived userId (e.g. from requireUser),
 * never request input. Returns null when the user is neither the owner nor a
 * member of the workspace.
 */
export async function getWorkspaceRole(
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  const admin = createAdminClient();

  // owner_id is canonical for "owner" (single-owner model).
  const { data: workspace } = await admin
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle<{ owner_id: string }>();

  if (workspace?.owner_id === userId) return "owner";

  const { data: membership } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle<{ role: WorkspaceRole }>();

  return membership?.role ?? null;
}

/**
 * Generic role gate. Resolves the authenticated user, computes their role in
 * the workspace, and checks it against `allowed`.
 *
 * Returns a discriminated result rather than throwing, so each route can map it
 * to its own response shape (JSON 403 for APIs, redirect for OAuth). Never
 * throws on an authorization decision.
 */
export async function requireWorkspaceRole(
  workspaceId: string,
  allowed: WorkspaceRole[]
): Promise<RoleCheckResult> {
  const user = await requireUser();
  if (!user) {
    return { ok: false, status: 401, reason: "unauthenticated" };
  }

  const role = await getWorkspaceRole(workspaceId, user.id);
  if (role === null) {
    // Auth + membership are always enforced, regardless of the kill-switch.
    return { ok: false, status: 403, reason: "not_a_member" };
  }

  if (allowed.includes(role)) {
    return { ok: true, userId: user.id, role, enforced: true };
  }

  // Role is insufficient. Honour the kill-switch: when enforcement is off, allow
  // through but log what *would* have been denied (observe mode).
  if (!rbacEnforced()) {
    console.warn(
      `[RBAC] would deny user=${user.id} role=${role} workspace=${workspaceId} needed=${allowed.join("|")}`
    );
    return { ok: true, userId: user.id, role, enforced: false };
  }

  return { ok: false, status: 403, reason: "insufficient_role" };
}

/** Convenience gate: owner or admin (workspace write operations). */
export function requireWorkspaceWrite(
  workspaceId: string
): Promise<RoleCheckResult> {
  return requireWorkspaceRole(workspaceId, ["owner", "admin"]);
}

/** Convenience gate: owner only (billing, ownership lifecycle). */
export function requireOwner(workspaceId: string): Promise<RoleCheckResult> {
  return requireWorkspaceRole(workspaceId, ["owner"]);
}

/**
 * OAuth-flavoured gate. Same logic as requireWorkspaceRole, but on failure it
 * attaches a redirect target (resolved from `redirectOnFail`) so OAuth start /
 * callback routes can `NextResponse.redirect(result.redirect)` instead of
 * returning JSON. On success, `redirect` is undefined.
 */
export async function requireWorkspaceRoleOrRedirect(
  workspaceId: string,
  allowed: WorkspaceRole[],
  redirectOnFail: (reason: Extract<RoleCheckResult, { ok: false }>["reason"]) => URL | string
): Promise<RoleCheckResult & { redirect?: URL | string }> {
  const result = await requireWorkspaceRole(workspaceId, allowed);
  if (result.ok) return result;
  return { ...result, redirect: redirectOnFail(result.reason) };
}
