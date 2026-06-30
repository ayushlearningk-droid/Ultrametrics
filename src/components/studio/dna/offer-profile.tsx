"use client";

/** Marketing DNA — Offer profile (Sprint 63R). Offer style, pricing, USP. */

import { Tag } from "lucide-react";
import { useBrandDna, DnaCard, DnaField } from "./brand-dna-context";

export function OfferProfile() {
  const dna = useBrandDna();
  return (
    <DnaCard title="Offer" icon={<Tag className="h-3.5 w-3.5 text-brand" />}>
      <DnaField label="Offer style" value={dna.offerStyle} />
      <DnaField label="Price positioning" value={dna.pricePositioning} />
      <DnaField label="USP" value={dna.usp} />
    </DnaCard>
  );
}
