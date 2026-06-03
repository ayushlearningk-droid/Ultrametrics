import { NextResponse } from "next/server";
import {
  getCurrentWorkspaceId,
  getUserWorkspaces,
} from "@/lib/data/workspaces";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      accountId?: string;
      name?: string;
      currency?: string;
    };

    if (!body.accountId || !body.name) {
      return NextResponse.json(
        { error: "Missing required account fields" },
        { status: 400 }
      );
    }

    const workspaces = await getUserWorkspaces();

    const workspaceId =
      await getCurrentWorkspaceId(workspaces);

    if (!workspaceId) {
      return NextResponse.json(
        { error: "No active workspace found" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: existingConnector, error: existingError } =
      await admin
        .from("connectors")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("provider", "meta_ads")
        .eq("external_account_id", body.accountId)
        .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    if (existingConnector) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
      });
    }

    const insertPayload = {
      workspace_id: workspaceId,
      provider: "meta_ads",
      name: body.name,
      status: "active",
      config: {
        currency: body.currency ?? "INR",
      },
      external_account_id: body.accountId,
      external_account_name: body.name,
      connected_by: user.id,
    };

    const { data, error } = await admin
      .from("connectors")
      .insert(insertPayload)
      .select();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      connector: data,
    });
  } catch (err) {
    console.error("CONNECT API CRASH:", err);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}