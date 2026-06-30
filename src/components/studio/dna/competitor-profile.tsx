"use client";

/** Marketing DNA — Competitor profile (Sprint 63R). Competitive set. */

import { Swords } from "lucide-react";
import { useBrandDna, DnaCard, DnaField, DnaChips } from "./brand-dna-context";

export function CompetitorProfile() {
  const dna = useBrandDna();
  return (
    <DnaCard title="Competitors" icon={<Swords className="h-3.5 w-3.5 text-brand" />}>
      <DnaField label="Competitive set" value={<DnaChips items={dna.competitors} />} />
    </DnaCard>
  );
}
