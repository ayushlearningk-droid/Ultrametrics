import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConnectorBackLinkProps = {
  href: string;
  label?: string;
};

export function ConnectorBackLink({
  href,
  label = "Back to connectors",
}: ConnectorBackLinkProps) {
  return (
    <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
      <Link href={href}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}
