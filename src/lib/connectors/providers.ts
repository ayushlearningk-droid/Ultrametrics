import {
  BarChart2,
  LineChart,
  ShoppingCart,
  Table2,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type ConnectorProviderId =
  | "meta_ads"
  | "google_ads"
  | "google_sheets"
  | "ga4"
  | "shopify";

export type ConnectorProvider = {
  id: ConnectorProviderId;
  name: string;
  description: string;
  color: string;
  icon: LucideIcon;
  available: boolean;
  href?: string;
};

export const CONNECTOR_PROVIDERS: ConnectorProvider[] = [
  {
    id: "google_ads",
    name: "Google Ads",
    description: "Sync campaign performance data",
    color: "bg-blue-500",
    icon: TrendingUp,
    available: true,
    href: "/dashboard/connectors/google-ads",
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    description: "Your data destination",
    color: "bg-emerald-500",
    icon: Table2,
    available: true,
    href: "/dashboard/connectors/google",
  },
  {
    id: "meta_ads",
    name: "Meta Ads",
    description: "Import ad account insights",
    color: "bg-indigo-500",
    icon: BarChart2,
    available: true,
    href: "/dashboard/connectors/meta",
  },
  {
    id: "ga4",
    name: "Google Analytics 4",
    description: "Website analytics insights",
    color: "bg-orange-500",
    icon: LineChart,
    available: false,
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "E-commerce order data",
    color: "bg-green-600",
    icon: ShoppingCart,
    available: false,
  },
];

export const META_ADS_CONNECT_PATH = "/dashboard/connectors/meta";
export const META_ADS_SELECT_ACCOUNT_PATH =
  "/dashboard/connectors/meta/select-account";
