"use client";

/** Marketing DNA — Visual profile (Sprint 63R). Visual style, colors, fonts. */

import { Palette } from "lucide-react";
import { useBrandDna, DnaCard, DnaField, DnaChips } from "./brand-dna-context";

export function VisualProfile() {
  const dna = useBrandDna();
  return (
    <DnaCard title="Visual" icon={<Palette className="h-3.5 w-3.5 text-brand" />}>
      <DnaField label="Visual style" value={dna.visualStyle} />
      <DnaField
        label="Preferred colors"
        value={
          <span className="inline-flex items-center justify-end gap-1.5">
            {dna.preferredColors.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 chip chip-slate">
                <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: c }} aria-hidden />
                {c}
              </span>
            ))}
          </span>
        }
      />
      <DnaField label="Preferred fonts" value={<DnaChips items={dna.preferredFonts} />} />
    </DnaCard>
  );
}
