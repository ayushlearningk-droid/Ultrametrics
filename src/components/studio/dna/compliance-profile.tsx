"use client";

/** Marketing DNA — Compliance profile (Sprint 63R). Restrictions + notes. */

import { ShieldCheck } from "lucide-react";
import { useBrandDna, DnaCard, DnaField } from "./brand-dna-context";

export function ComplianceProfile() {
  const dna = useBrandDna();
  return (
    <DnaCard title="Compliance" icon={<ShieldCheck className="h-3.5 w-3.5 text-brand" />}>
      <ul className="flex flex-col gap-1.5">
        {dna.restrictions.map((r) => (
          <li key={r} className="flex items-start gap-1.5 type-caption text-foreground">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
            {r}
          </li>
        ))}
      </ul>
      <div className="border-t border-white/[0.06] pt-2.5">
        <DnaField label="Notes" value={dna.complianceNotes} />
      </div>
    </DnaCard>
  );
}
