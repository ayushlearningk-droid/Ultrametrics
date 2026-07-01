/**
 * Asset persistence (Sprint 64N) — SERVER ONLY.
 *
 * Downloads a successfully generated asset from its temporary provider URL and
 * uploads it to the existing Supabase Storage bucket, returning a permanent
 * public URL. Uses the existing service-role admin client. Never throws — on any
 * failure it falls back to the (real) provider URL so execution metadata is
 * preserved and nothing crashes. No UI, no new store, no execution-architecture
 * change.
 */

import { createAdminClient } from "@/lib/supabase/admin";

/** Existing storage bucket (configurable via env; defaults to "studio-assets"). */
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "studio-assets";

export interface PersistResult {
  /** Permanent Supabase URL on success, else the original provider URL. */
  url: string;
  persisted: boolean;
  error?: string;
}

function extFor(mimeType: string): string {
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

/** Download the provider asset and upload it to Supabase Storage. */
export async function persistAsset(tempUrl: string, assetId: string, mimeType: string): Promise<PersistResult> {
  try {
    const download = await fetch(tempUrl);
    if (!download.ok) return { url: tempUrl, persisted: false, error: `download ${download.status}` };
    const bytes = Buffer.from(await download.arrayBuffer());

    const path = `generated/${assetId}-${Date.now()}.${extFor(mimeType)}`;
    const admin = createAdminClient();
    const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: mimeType, upsert: true });
    if (error) return { url: tempUrl, persisted: false, error: error.message };

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl ?? tempUrl, persisted: Boolean(data.publicUrl) };
  } catch (e) {
    return { url: tempUrl, persisted: false, error: e instanceof Error ? e.message : "persist failed" };
  }
}
