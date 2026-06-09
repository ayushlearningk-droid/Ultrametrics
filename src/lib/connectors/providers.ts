export type ConnectorProviderId =
  | "meta_ads"
  | "google_ads"
  | "google_sheets"
  | "ga4"
  | "shopify";

export type ConnectorProvider = {
  id: ConnectorProviderId;
  name: string;
  color: string;
  /** When true, user can start the connect flow from the UI */
  available: boolean;
  href?: string;
};

export const CONNECTOR_PROVIDERS: ConnectorProvider[] = [
  {
    id: "google_ads",
    name: "Google Ads",
    color: "bg-blue-500",
    available: true,
    href: "/dashboard/connectors/google-ads",
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    color: "bg-emerald-500",
    available: true,
    href: "/dashboard/connectors/google",
  },
  {
    id: "meta_ads",
    name: "Meta Ads",
    color: "bg-indigo-500",
    available: true,
    href: "/dashboard/connectors/meta",
  },
  {
    id: "ga4",
    name: "Google Analytics 4",
    color: "bg-orange-500",
    available: false,
  },
  {
    id: "shopify",
    name: "Shopify",
    color: "bg-emerald-500",
    available: false,
  },
];

export const META_ADS_CONNECT_PATH = "/dashboard/connectors/meta";
export const META_ADS_SELECT_ACCOUNT_PATH =
  "/dashboard/connectors/meta/select-account";
