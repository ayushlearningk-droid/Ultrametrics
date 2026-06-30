"use client";

/** Marketing DNA — Tone profile (Sprint 63R). Voice, writing style, CTA style. */

import { MessageSquareQuote } from "lucide-react";
import { useBrandDna, DnaCard, DnaField } from "./brand-dna-context";

export function ToneProfile() {
  const dna = useBrandDna();
  return (
    <DnaCard title="Tone & Voice" icon={<MessageSquareQuote className="h-3.5 w-3.5 text-brand" />}>
      <DnaField label="Brand voice" value={dna.brandVoice} />
      <DnaField label="Writing style" value={dna.writingStyle} />
      <DnaField label="CTA style" value={dna.ctaStyle} />
    </DnaCard>
  );
}
