/**
 * Studio export route (Sprint 64O) — SERVER ONLY.
 *
 * Builds a real ZIP package from the current generation. The client posts the
 * generation's real assets + metadata (from the Generation Store); the server
 * downloads each asset, assembles Assets/ + Manifest.json + Generation.json +
 * Brand.json + Prompt.txt + Metadata.json, and streams the ZIP as a download.
 * Only real generated assets are included; if none, returns a structured error.
 * Never crashes.
 */

import { NextResponse } from "next/server";
import { buildZip, type ZipEntry } from "@/lib/zip";

export const runtime = "nodejs";

interface ExportAsset {
  id: string;
  title: string;
  url: string;
  provider?: string;
  resolution?: string;
  mimeType?: string;
  latencyMs?: number;
  cost?: number;
  seed?: number;
  generationTimeMs?: number;
}

interface ExportPayload {
  name?: string;
  prompt?: string;
  assets?: ExportAsset[];
  generation?: unknown;
  brand?: unknown;
  metadata?: unknown;
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "campaign";
}

function extFor(mimeType?: string): string {
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

export async function POST(req: Request) {
  let body: ExportPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Only real, downloadable assets (no placeholders).
  const assets = (body.assets ?? []).filter((a) => typeof a.url === "string" && /^https?:\/\//.test(a.url));
  if (assets.length === 0) {
    return NextResponse.json({ error: "No generated assets available." }, { status: 400 });
  }

  const enc = new TextEncoder();
  const entries: ZipEntry[] = [];
  const manifestAssets: Array<Record<string, unknown>> = [];

  let i = 0;
  for (const asset of assets) {
    try {
      const res = await fetch(asset.url);
      if (!res.ok) continue;
      const data = new Uint8Array(await res.arrayBuffer());
      const file = `Assets/${slug(asset.title || asset.id)}-${i}.${extFor(asset.mimeType)}`;
      entries.push({ name: file, data });
      manifestAssets.push({
        id: asset.id,
        title: asset.title,
        file,
        provider: asset.provider,
        resolution: asset.resolution,
        mimeType: asset.mimeType,
        latencyMs: asset.latencyMs,
        cost: asset.cost,
        seed: asset.seed,
        generationTimeMs: asset.generationTimeMs,
      });
      i += 1;
    } catch {
      /* skip unreachable asset */
    }
  }

  if (entries.length === 0) {
    return NextResponse.json({ error: "No generated assets available." }, { status: 400 });
  }

  const name = body.name ?? "campaign";
  const manifest = {
    name,
    generatedAt: new Date().toISOString(),
    assetCount: entries.length,
    files: [...entries.map((e) => e.name), "Manifest.json", "Generation.json", "Brand.json", "Prompt.txt", "Metadata.json"],
    assets: manifestAssets,
  };

  entries.push({ name: "Manifest.json", data: enc.encode(JSON.stringify(manifest, null, 2)) });
  entries.push({ name: "Generation.json", data: enc.encode(JSON.stringify(body.generation ?? {}, null, 2)) });
  entries.push({ name: "Brand.json", data: enc.encode(JSON.stringify(body.brand ?? {}, null, 2)) });
  entries.push({ name: "Prompt.txt", data: enc.encode(body.prompt ?? "") });
  entries.push({ name: "Metadata.json", data: enc.encode(JSON.stringify(body.metadata ?? {}, null, 2)) });

  const zip = buildZip(entries);
  return new NextResponse(Buffer.from(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug(name)}.zip"`,
    },
  });
}
