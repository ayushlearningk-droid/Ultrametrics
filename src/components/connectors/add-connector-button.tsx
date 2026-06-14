"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CONNECTOR_PROVIDERS,
  META_ADS_CONNECT_PATH,
} from "@/lib/connectors/providers";

export function AddConnectorButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="brand">
          <Plus className="mr-2 h-4 w-4" />
          Add connector
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Choose a provider</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CONNECTOR_PROVIDERS.map((provider) =>
          provider.available ? (
            <DropdownMenuItem key={provider.id} asChild>
              <Link href={META_ADS_CONNECT_PATH}>{provider.name}</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={provider.id} disabled>
              {provider.name}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
