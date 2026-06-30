"use client";

/** Marketing DNA — Audience profile (Sprint 63R). Target audience + languages. */

import { Users } from "lucide-react";
import { useBrandDna, DnaCard, DnaField, DnaChips } from "./brand-dna-context";

export function AudienceProfile() {
  const dna = useBrandDna();
  return (
    <DnaCard title="Audience" icon={<Users className="h-3.5 w-3.5 text-brand" />}>
      <DnaField label="Target audience" value={dna.targetAudience} />
      <DnaField label="Primary languages" value={<DnaChips items={dna.primaryLanguages} />} />
    </DnaCard>
  );
}
