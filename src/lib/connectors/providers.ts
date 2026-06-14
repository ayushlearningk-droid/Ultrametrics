import {
  BarChart2,
  LineChart,
  ShoppingCart,
  Table2,
  TrendingUp,
  Music2,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

export type ConnectorProviderId =
  | "meta_ads"
  | "google_ads"
  | "google_sheets"
  | "ga4"
  | "shopify"
  | "tiktok_ads"
  | "amazon_ads";

export type ConnectorProvider = {
  id: ConnectorProviderId;
  name: string;
  description: string;
  color: string;
  gradient: string;
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
    gradient: "from-[#4285F4] to-[#34A853]",
    icon: TrendingUp,
    available: true,
    href: "/dashboard/connectors/google-ads",
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    description: "Your data destination",
    color: "bg-emerald-500",
    gradient: "from-[#0F9D58] to-[#34A853]",
    icon: Table2,
    available: true,
    href: "/dashboard/connectors/google",
  },
  {
    id: "meta_ads",
    name: "Meta Ads",
    description: "Import ad account insights",
    color: "bg-indigo-500",
    gradient: "from-[#0866FF] to-[#0064E0]",
    icon: BarChart2,
    available: true,
    href: "/dashboard/connectors/meta",
  },
  {
    id: "ga4",
    name: "Google Analytics 4",
    description: "Website analytics insights",
    color: "bg-orange-500",
    gradient: "from-[#E37400] to-[#F9AB00]",
    icon: LineChart,
    available: false,
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "E-commerce order data",
    color: "bg-green-600",
    gradient: "from-[#5E8E3E] to-[#96BF48]",
    icon: ShoppingCart,
    available: false,
  },
  {
    id: "tiktok_ads",
    name: "TikTok Ads",
    description: "TikTok campaign performance",
    color: "bg-neutral-900",
    gradient: "from-[#010101] to-[#2b2b2b]",
    icon: Music2,
    available: false,
  },
  {
    id: "amazon_ads",
    name: "Amazon Ads",
    description: "Sponsored product campaigns",
    color: "bg-amber-500",
    gradient: "from-[#FF9900] to-[#E68200]",
    icon: ShoppingBag,
    available: false,
  },
];

export const META_ADS_CONNECT_PATH = "/dashboard/connectors/meta";
export const META_ADS_SELECT_ACCOUNT_PATH =
  "/dashboard/connectors/meta/select-account";
