/**
 * Brand SVG icon components — pixel-perfect, zero external dependencies.
 * Each icon renders as a rounded-square app icon at any size.
 * Pass className for sizing (e.g. "h-8 w-8").
 */

interface IconProps {
  className?: string;
}

/* ── Meta Ads ─────────────────────────────────────────────────────────────── */
export function MetaIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#0866FF" />
      <path
        d="M22 21.5h3.2l.8-4H22v-2c0-1.1.4-2 1.8-2H26V10s-2-.3-3.2-.3C19.4 9.7 17.5 11.8 17.5 15v2.5H14v4h3.5V32H22V21.5z"
        fill="white"
      />
    </svg>
  );
}

/* ── Google Ads ───────────────────────────────────────────────────────────── */
export function GoogleAdsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="white" />
      <rect width="40" height="40" rx="10" fill="#F1F3F4" />
      {/* Blue bar */}
      <rect x="8" y="22" width="7" height="10" rx="2" fill="#4285F4" />
      {/* Yellow bar */}
      <rect x="17" y="16" width="7" height="16" rx="2" fill="#FBBC04" />
      {/* Green bar */}
      <rect x="26" y="10" width="7" height="22" rx="2" fill="#34A853" />
      {/* Red dot on green bar */}
      <circle cx="29.5" cy="10" r="3.5" fill="#EA4335" />
    </svg>
  );
}

/* ── Google Sheets ────────────────────────────────────────────────────────── */
export function GoogleSheetsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#0F9D58" />
      <rect x="10" y="12" width="20" height="16" rx="1.5" fill="white" fillOpacity="0.2" />
      <rect x="10" y="12" width="20" height="16" rx="1.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
      {/* Grid lines */}
      <line x1="10" y1="18" x2="30" y2="18" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
      <line x1="10" y1="22" x2="30" y2="22" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
      <line x1="10" y1="26" x2="30" y2="26" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
      <line x1="17" y1="12" x2="17" y2="28" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
      <line x1="24" y1="12" x2="24" y2="28" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
    </svg>
  );
}

/* ── GA4 ──────────────────────────────────────────────────────────────────── */
export function GA4Icon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#E37400" />
      {/* Analytics bars */}
      <rect x="9" y="24" width="5" height="8" rx="1.5" fill="white" fillOpacity="0.9" />
      <rect x="17" y="18" width="5" height="14" rx="1.5" fill="white" fillOpacity="0.9" />
      <rect x="25" y="10" width="5" height="22" rx="1.5" fill="white" fillOpacity="0.9" />
      {/* Trend line */}
      <path d="M11.5 23 L19.5 17 L27.5 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" strokeOpacity="0.7" />
    </svg>
  );
}

/* ── Shopify ──────────────────────────────────────────────────────────────── */
export function ShopifyIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#5E8E3E" />
      {/* Shopping bag */}
      <path
        d="M26 14h-2.2c-.1-1.6-1.3-2.8-2.8-2.8s-2.7 1.2-2.8 2.8H16l-1.5 16h13L26 14zm-5 0c0-.9.7-1.6 1.6-1.6s1.6.7 1.6 1.6h-3.2zm5.5 10.3l-1.8-1.2c-.3-.2-.7-.1-.9.2l-1.2 1.8-1.9-2.3c-.2-.3-.6-.4-.9-.2l-2.7 1.6.6-8.2H26l-.5 8.3z"
        fill="white"
      />
    </svg>
  );
}

/* ── TikTok ───────────────────────────────────────────────────────────────── */
export function TikTokIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#010101" />
      {/* TikTok note shape */}
      <path
        d="M27 11.5c-.9-1-1.5-2.4-1.5-3.5h-3.8v16.2c0 1.7-1.4 3-3 3s-3-1.4-3-3 1.4-3 3-3c.3 0 .6 0 .9.1V17c-.3 0-.6-.1-.9-.1C15.8 16.9 13 19.7 13 23.2s2.8 6.3 6.2 6.3 6.2-2.8 6.2-6.3V17c1.4 1 3.1 1.5 4.8 1.5v-3.8c-1.2 0-2.3-.5-3.2-1.2z"
        fill="white"
      />
      {/* Cyan shadow */}
      <path
        d="M25.5 10c-.9-1-1.5-2.4-1.5-3.5h-3.8v16.2c0 1.7-1.4 3-3 3s-3-1.4-3-3 1.4-3 3-3c.3 0 .6 0 .9.1V15.5c-.3 0-.6-.1-.9-.1-3.4 0-6.2 2.8-6.2 6.3s2.8 6.3 6.2 6.3 6.2-2.8 6.2-6.3V15.5c1.4 1 3.1 1.5 4.8 1.5V13c-1.2 0-2.3-.5-3.2-1.2z"
        fill="#69C9D0"
        fillOpacity="0.5"
      />
    </svg>
  );
}

/* ── Amazon Ads ───────────────────────────────────────────────────────────── */
export function AmazonAdsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#FF9900" />
      {/* Amazon "a" */}
      <path
        d="M17 15.5c0-2.5 2.3-4 6-4 1.5 0 2.8.3 3.5.6V11c-.7-.4-2.3-.8-4-.8-4.5 0-7.8 2.5-7.8 6.5 0 3.8 3 5.8 6.2 5.8 2.2 0 3.8-.5 4.8-1v-1.7c-1 .5-2.5.9-4.2.9-2.5 0-4.5-1.3-4.5-4.2z"
        fill="white"
      />
      {/* Amazon smile arrow */}
      <path
        d="M11 24.5c3.2 2.5 7.5 3.5 11.5 3.5 3 0 6.5-.7 9-2.5.3-.2.1-.5-.2-.3-2.5 1.2-5.8 2-9 2-3.8 0-7.5-1-10.5-2.8-.3-.2-.6.1-.3.3l-.5.8z"
        fill="white"
      />
      <path
        d="M22.5 23.5c0-.5.3-.7.8-.5l2.8 1c.4.1.4.5.1.7l-1 .8c-.2.2-.6.1-.8-.1l-1.9-1.9z"
        fill="white"
      />
    </svg>
  );
}

/* ── Generic platform fallback ────────────────────────────────────────────── */
export function GenericPlatformIcon({
  className,
  color = "#4F8BEE",
  label,
}: IconProps & { color?: string; label?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill={color} />
      {label && (
        <text
          x="20"
          y="25"
          textAnchor="middle"
          fill="white"
          fontSize="14"
          fontWeight="bold"
          fontFamily="system-ui"
        >
          {label.slice(0, 2).toUpperCase()}
        </text>
      )}
    </svg>
  );
}

/** Map from provider ID to its brand icon component */
export const BRAND_ICON_MAP: Record<
  string,
  React.ComponentType<IconProps>
> = {
  meta_ads: MetaIcon,
  google_ads: GoogleAdsIcon,
  google_sheets: GoogleSheetsIcon,
  ga4: GA4Icon,
  shopify: ShopifyIcon,
  tiktok_ads: TikTokIcon,
  amazon_ads: AmazonAdsIcon,
};
