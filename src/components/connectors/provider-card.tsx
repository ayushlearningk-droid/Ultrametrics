import Link from "next/link";
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
};

export function ProviderCard({ provider }: ProviderCardProps) {
  const content = (
    <Card
      className={cn(
        "transition-colors",
        provider.available &&
          "cursor-pointer hover:border-brand/40 focus-within:ring-2 focus-within:ring-ring",
        !provider.available && "opacity-60"
      )}
    >
      <CardHeader className="pb-2">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${provider.color} text-sm font-bold text-white`}
        >
          {provider.name.charAt(0)}
        </div>
        <CardTitle className="text-base">{provider.name}</CardTitle>
        <CardDescription>
          {provider.available ? "Connect & sync" : "Coming soon"}
        </CardDescription>
      </CardHeader>
    </Card>
  );

  if (provider.available && provider.href) {
    return (
      <Link href={provider.href} className="block rounded-lg outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
