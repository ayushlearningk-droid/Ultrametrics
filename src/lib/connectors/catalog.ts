/**
 * Connector Marketplace catalog (Sprint 50) — single source of truth for the
 * marketplace UI. Pure, serializable metadata (no functions) so it can pass the
 * server→client boundary. Adding a future connector = adding ONE object here.
 *
 * This is presentation metadata only — it does NOT touch the connector backend,
 * OAuth, sync engine, or the existing CONNECTOR_PROVIDERS used by connect flows.
 * Live providers reuse their existing connect hrefs; everything else is marked
 * coming-soon (future-ready) and never offers a connect action.
 */

export type ConnectorCategory =
  | "Advertising"
  | "Analytics"
  | "CRM"
  | "Commerce"
  | "Storage"
  | "Communication"
  | "Productivity"
  | "Social"
  | "Developer"
  | "Marketing"
  | "AI";

export type ConnectorAvailability = "available" | "beta" | "coming_soon";
export type ConnectorExecutionMode = "read-only";

/** A logo key resolved to an icon component in the client (keeps this serializable). */
export type ConnectorLogo =
  | "google-ads"
  | "meta"
  | "sheets"
  | "ga4"
  | "shopify"
  | "tiktok"
  | "amazon"
  | "hubspot"
  | "salesforce"
  | "klaviyo"
  | "slack"
  | "notion"
  | "linkedin"
  | "pinterest"
  | "snowflake"
  | "stripe"
  | "openai";

export interface ConnectorDefinition {
  id: string;
  name: string;
  logo: ConnectorLogo;
  category: ConnectorCategory;
  description: string;
  status: ConnectorAvailability;
  permissions: string[];
  supportedFeatures: string[];
  /** Required OAuth scopes (display only — never used to authenticate here). */
  requiredScopes: string[];
  securityNotes: string;
  docsUrl?: string;
  /** Existing connect route for live providers (reused, never created). */
  connectHref?: string;
  comingSoon: boolean;
  oauthSupported: boolean;
  executionMode: ConnectorExecutionMode;
  /** Brand accent (logo chip tint only — not a theme token). */
  color: string;
}

export const CONNECTOR_CATALOG: ConnectorDefinition[] = [
  {
    id: "google_ads",
    name: "Google Ads",
    logo: "google-ads",
    category: "Advertising",
    description: "Sync campaign, ad group, and keyword performance.",
    status: "available",
    permissions: ["read:campaigns", "read:metrics"],
    supportedFeatures: ["Campaign metrics", "Conversions", "Spend & ROAS", "Daily sync"],
    requiredScopes: ["https://www.googleapis.com/auth/adwords"],
    securityNotes: "Read-only access. Tokens are encrypted at rest; no write scopes requested.",
    docsUrl: "https://support.google.com/google-ads",
    connectHref: "/dashboard/connectors/google-ads",
    comingSoon: false,
    oauthSupported: true,
    executionMode: "read-only",
    color: "#4285F4",
  },
  {
    id: "meta_ads",
    name: "Meta Ads",
    logo: "meta",
    category: "Advertising",
    description: "Import Facebook & Instagram ad account insights.",
    status: "available",
    permissions: ["read:ads_insights", "read:campaigns"],
    supportedFeatures: ["Ad insights", "Audience breakdowns", "Spend & ROAS", "Daily sync"],
    requiredScopes: ["ads_read"],
    securityNotes: "Read-only ads_read scope. No publishing or write permissions requested.",
    docsUrl: "https://developers.facebook.com/docs/marketing-apis",
    connectHref: "/dashboard/connectors/meta",
    comingSoon: false,
    oauthSupported: true,
    executionMode: "read-only",
    color: "#0866FF",
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    logo: "sheets",
    category: "Storage",
    description: "Your data destination for synced metrics.",
    status: "available",
    permissions: ["write:sheets"],
    supportedFeatures: ["Scheduled exports", "Custom ranges", "Multi-tab"],
    requiredScopes: ["https://www.googleapis.com/auth/spreadsheets"],
    securityNotes: "Access scoped to spreadsheets you authorize. Encrypted token storage.",
    docsUrl: "https://developers.google.com/sheets/api",
    connectHref: "/dashboard/connectors/google",
    comingSoon: false,
    oauthSupported: true,
    executionMode: "read-only",
    color: "#0F9D58",
  },
  {
    id: "ga4",
    name: "Google Analytics 4",
    logo: "ga4",
    category: "Analytics",
    description: "Website & app analytics, sessions, and conversions.",
    status: "coming_soon",
    permissions: ["read:analytics"],
    supportedFeatures: ["Sessions", "Conversions", "Channel attribution"],
    requiredScopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    securityNotes: "Read-only analytics scope.",
    comingSoon: true,
    oauthSupported: false,
    executionMode: "read-only",
    color: "#E37400",
  },
  {
    id: "shopify",
    name: "Shopify",
    logo: "shopify",
    category: "Commerce",
    description: "E-commerce orders, products, and revenue.",
    status: "coming_soon",
    permissions: ["read:orders", "read:products"],
    supportedFeatures: ["Orders", "Revenue", "Product performance"],
    requiredScopes: ["read_orders", "read_products"],
    securityNotes: "Read-only storefront and order scopes.",
    comingSoon: true,
    oauthSupported: false,
    executionMode: "read-only",
    color: "#5E8E3E",
  },
  {
    id: "tiktok_ads",
    name: "TikTok Ads",
    logo: "tiktok",
    category: "Advertising",
    description: "TikTok campaign performance and creative insights.",
    status: "coming_soon",
    permissions: ["read:campaigns", "read:metrics"],
    supportedFeatures: ["Campaign metrics", "Creative performance", "Spend"],
    requiredScopes: ["ads.read"],
    securityNotes: "Read-only reporting access.",
    comingSoon: true,
    oauthSupported: false,
    executionMode: "read-only",
    color: "#111111",
  },
  {
    id: "amazon_ads",
    name: "Amazon Ads",
    logo: "amazon",
    category: "Commerce",
    description: "Sponsored Products & Brands campaign data.",
    status: "coming_soon",
    permissions: ["read:campaigns", "read:metrics"],
    supportedFeatures: ["Sponsored Products", "ACOS & ROAS", "Spend"],
    requiredScopes: ["advertising::campaign_management"],
    securityNotes: "Read-only advertising reporting scope.",
    comingSoon: true,
    oauthSupported: false,
    executionMode: "read-only",
    color: "#FF9900",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    logo: "hubspot",
    category: "CRM",
    description: "Contacts, deals, and pipeline analytics.",
    status: "coming_soon",
    permissions: ["read:contacts", "read:deals"],
    supportedFeatures: ["Contacts", "Deal pipeline", "Attribution"],
    requiredScopes: ["crm.objects.contacts.read"],
    securityNotes: "Read-only CRM scopes.",
    comingSoon: true,
    oauthSupported: false,
    executionMode: "read-only",
    color: "#FF7A59",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    logo: "salesforce",
    category: "CRM",
    description: "Opportunities, leads, and revenue attribution.",
    status: "coming_soon",
    permissions: ["read:opportunities", "read:leads"],
    supportedFeatures: ["Opportunities", "Leads", "Revenue"],
    requiredScopes: ["api", "refresh_token"],
    securityNotes: "Read-only API access via connected app.",
    comingSoon: true,
    oauthSupported: false,
    executionMode: "read-only",
    color: "#00A1E0",
  },
  {
    id: "klaviyo",
    name: "Klaviyo",
    logo: "klaviyo",
    category: "Marketing",
    description: "Email & SMS campaign performance.",
    status: "coming_soon",
    permissions: ["read:campaigns", "read:metrics"],
    supportedFeatures: ["Email metrics", "Flows", "Revenue per send"],
    requiredScopes: ["campaigns:read"],
    securityNotes: "Read-only marketing metrics.",
    comingSoon: true,
    oauthSupported: false,
    executionMode: "read-only",
    color: "#1A1A18",
  },
  {
    id: "linkedin_ads",
    name: "LinkedIn Ads",
    logo: "linkedin",
    category: "Social",
    description: "B2B campaign performance and lead gen.",
    status: "coming_soon",
    permissions: ["read:ads", "read:metrics"],
    supportedFeatures: ["Campaign metrics", "Lead gen forms", "Spend"],
    requiredScopes: ["r_ads_reporting"],
    securityNotes: "Read-only ad reporting scope.",
    comingSoon: true,
    oauthSupported: false,
    executionMode: "read-only",
    color: "#0A66C2",
  },
  {
    id: "pinterest_ads",
    name: "Pinterest Ads",
    logo: "pinterest",
    category: "Social",
    description: "Pin performance and campaign metrics.",
    status: "coming_soon",
    permissions: ["read:campaigns", "read:metrics"],
    supportedFeatures: ["Campaign metrics", "Conversions", "Spend"],
    requiredScopes: ["ads:read"],
    securityNotes: "Read-only reporting scope.",
    comingSoon: true,
    oauthSupported: false,
    executionMode: "read-only",
    color: "#E60023",
  },
  {
    id: "slack",
    name: "Slack",
    logo: "slack",
    category: "Communication",
    description: "Deliver alerts and digests to channels.",
    status: "coming_soon",
    permissions: ["write:messages"],
    supportedFeatures: ["Alerts", "Scheduled digests", "Channel routing"],
    requiredScopes: ["chat:write"],
    securityNotes: "Scoped to channels you authorize.",
    comingSoon: true,
    oauthSupported: false,
    executionMode: "read-only",
    color: "#611F69",
  },
  {
    id: "notion",
    name: "Notion",
    logo: "notion",
    category: "Productivity",
    description: "Export reports to Notion databases.",
    status: "coming_soon",
    permissions: ["write:pages"],
    supportedFeatures: ["Report export", "Database sync"],
    requiredScopes: ["content.read", "content.write"],
    securityNotes: "Access scoped to selected pages.",
    comingSoon: true,
    oauthSupported: false,
    executionMode: "read-only",
    color: "#111111",
  },
  {
    id: "snowflake",
    name: "Snowflake",
    logo: "snowflake",
    category: "Developer",
    description: "Warehouse your marketing data for BI.",
    status: "coming_soon",
    permissions: ["write:warehouse"],
    supportedFeatures: ["Warehouse sync", "Scheduled loads"],
    requiredScopes: ["warehouse:write"],
    securityNotes: "Key-pair auth; least-privilege role.",
    comingSoon: true,
    oauthSupported: false,
    executionMode: "read-only",
    color: "#29B5E8",
  },
  {
    id: "stripe",
    name: "Stripe",
    logo: "stripe",
    category: "Commerce",
    description: "Revenue, subscriptions, and MRR.",
    status: "coming_soon",
    permissions: ["read:charges", "read:subscriptions"],
    supportedFeatures: ["Revenue", "MRR", "Churn"],
    requiredScopes: ["read_only"],
    securityNotes: "Restricted read-only API key.",
    comingSoon: true,
    oauthSupported: false,
    executionMode: "read-only",
    color: "#635BFF",
  },
  {
    id: "openai",
    name: "OpenAI",
    logo: "openai",
    category: "AI",
    description: "Bring your own model for enrichment.",
    status: "coming_soon",
    permissions: ["read:usage"],
    supportedFeatures: ["Usage metrics", "Cost tracking"],
    requiredScopes: ["api.read"],
    securityNotes: "API key stored encrypted; usage scope only.",
    comingSoon: true,
    oauthSupported: false,
    executionMode: "read-only",
    color: "#10A37F",
  },
];

/** All categories present in the catalog, in display order. */
export const CONNECTOR_CATEGORIES: ConnectorCategory[] = [
  "Advertising",
  "Analytics",
  "CRM",
  "Commerce",
  "Storage",
  "Communication",
  "Productivity",
  "Social",
  "Developer",
  "Marketing",
  "AI",
];
