import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_ICON_MAP, GenericPlatformIcon } from "@/components/ui/brand-icons";
import type { ConnectorProvider } from "@/lib/connectors/providers";

type ProviderCardProps = {
  provider: ConnectorProvider;
  connected?: boolean;
};

export function ProviderCard({ provider, connected = false }: ProviderCardProps) {
  const BrandIcon = BRAND_ICON_MAP[provider.id];

  const content = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border p-5 transition-all duration-200",
        "bg-white/[0.025] backdrop-blur-sm",
        provider.available
          ? "cursor-pointer border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-black/20"
          : "cursor-default border-white/[0.04] opacity-50"
      )}
    >
      {/* Top-edge highlight on hover */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-200",
          provider.available && "group-hover:opacity-100"
        )}
      />

      {/* Connected badge */}
      {connected && (
        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30">
          <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
        </div>
      )}

      {/* Coming soon badge */}
      {!provider.available && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5">
          <Lock className="h-2.5 w-2.5 text-muted-foreground/60" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Soon
          </span>
        </div>
      )}

      <div className="space-y-3">
        {/* Brand icon */}
        <div>
          {BrandIcon ? (
            <BrandIcon className="h-10 w-10" />
          ) : (
            <GenericPlatformIcon
              className="h-10 w-10"
              label={provider.name}
            />
          )}
        </div>

        {/* Text */}
        <div>
          <p className="text-sm font-semibold leading-tight">{provider.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {provider.available ? provider.description : "Coming soon"}
          </p>
        </div>
      </div>
    </div>
  );

  if (provider.available && provider.href) {
    return (
      <Link
        href={provider.href}
        className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </Link>
    );
  }

  return content;
}
