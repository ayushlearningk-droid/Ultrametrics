"use client";

/** Marketing DNA — Brand profile (Sprint 63R). Identity, category, goal, assets. */

import { Building2, Image as ImageIcon } from "lucide-react";
import { useBrandDna, DnaCard, DnaField } from "./brand-dna-context";

export function BrandProfile() {
  const dna = useBrandDna();
  return (
    <DnaCard title="Brand" icon={<Building2 className="h-3.5 w-3.5 text-brand" />}>
      <DnaField label="Brand name" value={dna.brandName} />
      <DnaField label="Category" value={dna.businessCategory} />
      <DnaField label="Website" value={dna.website} />
      <DnaField label="Primary goal" value={dna.primaryGoal} />
      <DnaField label="Logo" value={dna.logo} />
      <div className="flex flex-wrap justify-end gap-1.5 border-t border-white/[0.06] pt-2.5">
        {dna.brandAssets.map((a) => (
          <span key={a.id} className="inline-flex items-center gap-1 chip chip-slate">
            <ImageIcon className="h-3 w-3" /> {a.label}
          </span>
        ))}
      </div>
    </DnaCard>
  );
}
