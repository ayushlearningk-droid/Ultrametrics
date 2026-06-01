export const STRIPE_CONFIG = {
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
  portalReturnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
} as const;

export function getPriceId(planId: string, interval: "monthly" | "yearly"): string | null {
  const envMap: Record<string, Record<string, string | undefined>> = {
    starter: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY,
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEARLY,
    },
    growth: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_MONTHLY,
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_YEARLY,
    },
  };

  return envMap[planId]?.[interval] ?? null;
}
