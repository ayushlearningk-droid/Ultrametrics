export const APP_NAME = "Ultrametrics";
export const COPYRIGHT_YEAR = 2026;

/** Contact endpoints used across the app and legal pages. */
export const CONTACT_EMAIL = "ultrametrics.ai@gmail.com";
export const PRIVACY_EMAIL = "privacy@ultrametrics.app";
/** Effective/last-updated date shown on the legal documents. */
export const LEGAL_LAST_UPDATED = "June 26, 2026";
export const APP_DESCRIPTION =
  "Connect your marketing data sources, automate syncs, and unify analytics in one workspace.";

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    description: "For small teams getting started with unified reporting.",
    priceMonthly: 49,
    priceYearly: 470,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY,
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEARLY,
    features: [
      "2 data connectors",
      "Daily sync",
      "1 workspace",
      "Email support",
    ],
    highlighted: false,
  },
  {
    id: "growth",
    name: "Growth",
    description: "For growing teams that need more connectors and automation.",
    priceMonthly: 149,
    priceYearly: 1430,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_MONTHLY,
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_YEARLY,
    features: [
      "10 data connectors",
      "Hourly sync",
      "5 workspaces",
      "Priority support",
      "Custom dashboards",
    ],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For organizations with advanced security and scale needs.",
    priceMonthly: null,
    priceYearly: null,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    features: [
      "Unlimited connectors",
      "Real-time sync",
      "Unlimited workspaces",
      "Dedicated success manager",
      "SSO & audit logs",
    ],
    highlighted: false,
  },
] as const;

export const LANDING_FEATURES = [
  {
    title: "Unified connectors",
    description:
      "Plug in Google Ads, Meta, GA4, Shopify, and more. One pipeline for every channel.",
    icon: "Plug" as const,
  },
  {
    title: "Automated sync jobs",
    description:
      "Schedule hourly or daily syncs with full visibility into job history and failures.",
    icon: "RefreshCw" as const,
  },
  {
    title: "Workspace isolation",
    description:
      "Separate client or brand data with role-based access across workspaces.",
    icon: "Layers" as const,
  },
  {
    title: "Subscription billing",
    description:
      "Stripe-powered plans that scale with your connector and workspace usage.",
    icon: "CreditCard" as const,
  },
  {
    title: "Enterprise security",
    description:
      "Row-level security on Supabase with audit-ready data boundaries.",
    icon: "Shield" as const,
  },
  {
    title: "Export anywhere",
    description:
      "Push clean datasets to BigQuery, Sheets, or your BI tool of choice.",
    icon: "Download" as const,
  },
];

export const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#cta", label: "Contact" },
];
