/**
 * Workspace settings — data layer (Sprint 16).
 *
 * Read/write over public.workspace_settings through the user's SSR (anon)
 * client, so RLS enforces workspace-membership on every call (no service role).
 * One row per workspace; reads fall back to typed defaults when no row exists
 * yet (a workspace is valid before it has ever saved settings).
 *
 * Preferences only — does NOT change connector or Action Engine behaviour.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  WorkspaceSettingsRow,
  WorkspaceSettingsUpdate,
} from "@/types/database";

export type DateFormat =
  | "YYYY-MM-DD"
  | "MM/DD/YYYY"
  | "DD/MM/YYYY"
  | "D MMM YYYY";
export type Environment = "production" | "sandbox";

/** The editable settings shape (no row metadata). */
export interface WorkspaceSettingsValues {
  ai_insights_enabled: boolean;
  action_engine_enabled: boolean;
  scheduled_actions_enabled: boolean;
  autonomous_ai_enabled: boolean;
  beta_features_enabled: boolean;
  timezone: string;
  currency: string;
  date_format: DateFormat;
  notify_email: boolean;
  notify_in_app: boolean;
  notify_failed_sync: boolean;
  notify_ai_opportunities: boolean;
  environment: Environment;
}

/** Typed defaults, matching the DB column defaults. */
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettingsValues = {
  ai_insights_enabled: true,
  action_engine_enabled: false,
  scheduled_actions_enabled: false,
  autonomous_ai_enabled: false,
  beta_features_enabled: false,
  timezone: "UTC",
  currency: "USD",
  date_format: "YYYY-MM-DD",
  notify_email: true,
  notify_in_app: true,
  notify_failed_sync: true,
  notify_ai_opportunities: true,
  environment: "production",
};

/** Project a row (or null) onto the editable values, applying defaults. */
export function toSettingsValues(
  row: WorkspaceSettingsRow | null
): WorkspaceSettingsValues {
  if (!row) return { ...DEFAULT_WORKSPACE_SETTINGS };
  return {
    ai_insights_enabled: row.ai_insights_enabled,
    action_engine_enabled: row.action_engine_enabled,
    scheduled_actions_enabled: row.scheduled_actions_enabled,
    autonomous_ai_enabled: row.autonomous_ai_enabled,
    beta_features_enabled: row.beta_features_enabled,
    timezone: row.timezone,
    currency: row.currency,
    date_format: row.date_format,
    notify_email: row.notify_email,
    notify_in_app: row.notify_in_app,
    notify_failed_sync: row.notify_failed_sync,
    notify_ai_opportunities: row.notify_ai_opportunities,
    environment: row.environment,
  };
}

/** Fetch the workspace's settings row (RLS-scoped). Null when none saved yet. */
export async function getWorkspaceSettings(
  workspaceId: string
): Promise<WorkspaceSettingsRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as WorkspaceSettingsRow | null) ?? null;
}

/**
 * Create-or-update the workspace's settings (single row per workspace). RLS
 * gates the write on workspace membership; `last_saved_by` records the actor.
 */
export async function upsertWorkspaceSettings(
  workspaceId: string,
  values: WorkspaceSettingsValues,
  userId: string
): Promise<WorkspaceSettingsRow | null> {
  const supabase = await createClient();
  const payload: WorkspaceSettingsUpdate = {
    workspace_id: workspaceId,
    ...values,
    last_saved_by: userId,
  };
  const { data, error } = await supabase
    .from("workspace_settings")
    .upsert(payload, { onConflict: "workspace_id" })
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as WorkspaceSettingsRow | null) ?? null;
}
