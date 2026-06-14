import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { STRIPE_CONFIG, getPriceId } from "@/lib/stripe/config";
import type { Subscription, User, Workspace } from "@/types/database";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, planId, interval = "monthly" } = body as {
      workspaceId: string;
      planId: string;
      interval?: "monthly" | "yearly";
    };

    if (!workspaceId || !planId) {
      return NextResponse.json(
        { error: "workspaceId and planId are required" },
        { status: 400 }
      );
    }

    const priceId = getPriceId(planId, interval);
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured for this plan" },
        { status: 400 }
      );
    }

    const { data: workspaceData } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();

    const workspace = workspaceData as Workspace | null;

    if (!workspace || workspace.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: subscriptionData } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .single();

    const subscription = subscriptionData as Pick<
      Subscription,
      "stripe_customer_id"
    > | null;

    const stripe = getStripe();
    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      const { data: profileData } = await supabase
        .from("users")
        .select("email, full_name")
        .eq("id", user.id)
        .single();

      const profile = profileData as Pick<User, "email" | "full_name"> | null;

      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email,
        name: profile?.full_name ?? undefined,
        metadata: { workspace_id: workspaceId, user_id: user.id },
      });
      customerId = customer.id;

      const admin = createAdminClient();
      await admin
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("workspace_id", workspaceId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: STRIPE_CONFIG.successUrl,
      cancel_url: STRIPE_CONFIG.cancelUrl,
      metadata: {
        workspace_id: workspaceId,
        plan_id: planId,
      },
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
          plan_id: planId,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
