import Link from "next/link";
import { Check } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ConnectorProvider } from "@/lib/connectors/providers";

type ProviderCardProps = {
  provider: ConnectorProvider;
  connected?: boolean;
};

export function ProviderCard({ provider, connected = false }: ProviderCardProps) {
  const Icon = provider.icon;

  const content = (
    <Card
      className={cn(
        "relative transition-all duration-200",
        provider.available &&
          "cursor-pointer hover:border-brand/50 hover:shadow-md hover:shadow-brand/5",
        !provider.available && "opacity-50 cursor-default"
      )}
    >
      {connected && (
        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
          <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
        </div>
      )}
      <CardHeader className="space-y-3 pb-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            provider.color
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <CardTitle className="text-sm font-semibold">{provider.name}</CardTitle>
          <CardDescription className="mt-0.5 text-xs">
            {provider.available ? provider.description : "Coming soon"}
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );

  if (provider.available && provider.href) {
    return (
      <Link href={provider.href} className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {content}
      </Link>
    );
  }

  return content;
}
