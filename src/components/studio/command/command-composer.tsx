"use client";

/**
 * AI Studio Command Center — composer (Sprint 63).
 *
 * The ChatGPT/Creatify-style command surface, outcome-first. Reuses the Prompt
 * Composer state + selectors and adds tool selectors, product upload, drag &
 * drop, paste, and keyboard shortcuts. "Generate Campaign" invokes the existing
 * flow (opens the Unified Workspace → Outcome → Movie → Employees → Queue →
 * Approval). Presentation only — no fake loading.
 */

import { Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useComposer } from "@/components/studio/composer/composer-context";
import { ComposerSection } from "@/components/studio/composer/composer-primitives";
import { OutcomeSelector, BrandSelector } from "@/components/studio/composer/selectors";
import { ReferenceUpload, ingestFiles } from "./product-upload";
import { ModelSelector, VoiceSelector, KnowledgeSelector, SkillsSelector, ConnectorsSelector, MemorySelector } from "./tool-selectors";

function GenerateCampaign({ onGenerate }: { onGenerate: () => void }) {
  const { ready } = useComposer();
  return (
    <button
      type="button"
      disabled={!ready}
      aria-disabled={!ready}
      onClick={onGenerate}
      title={ready ? "Generate campaign (⌘↵)" : "Choose an outcome and add a brief"}
      className={cn(
        "studio-focusable flex items-center gap-2 rounded-[var(--studio-radius-md)] px-4 py-2.5 type-body font-semibold transition-transform",
        ready ? "bg-brand text-[hsl(var(--brand-foreground))] hover:scale-[1.02] active:scale-100 motion-reduce:hover:scale-100" : "cursor-default bg-brand/15 text-brand opacity-70"
      )}
    >
      Generate Campaign <ArrowRight className="h-4 w-4" />
    </button>
  );
}

export function CommandComposer({ onGenerate }: { onGenerate: () => void }) {
  const { brief, setField, ready } = useComposer();

  // Real reference-image input (Sprint 65.0): drop on the card or Ctrl+V paste.
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    ingestFiles(e.dataTransfer.files);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files.length > 0) ingestFiles(e.clipboardData.files);
  };

  return (
    <div className="studio-hero relative flex flex-col gap-4 overflow-hidden p-6 md:p-7" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <div aria-hidden className="studio-ambient pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 type-eyebrow text-foreground-muted">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Command Center
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">What outcome do you want?</h1>
        </div>

        {/* Brief textarea (DnD on the card, paste here, ⌘↵ to generate) */}
        <div className="studio-glass p-3">
          <textarea
            value={brief.offer}
            onChange={(e) => setField("offer", e.target.value)}
            onPaste={onPaste}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && ready) onGenerate();
            }}
            rows={3}
            aria-label="Describe the campaign you want"
            placeholder="Describe the campaign, paste a product link, or drop a product image…"
            className="w-full resize-none bg-transparent px-2 py-1 type-body leading-relaxed text-foreground outline-none placeholder:text-foreground-muted"
          />
          <ReferenceUpload />
        </div>

        {/* Outcome-first */}
        <OutcomeSelector />

        {/* Tools */}
        <ComposerSection title="Tools" description="Model, voice, brand, knowledge, skills, connectors, memory.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ModelSelector />
            <VoiceSelector />
            <BrandSelector />
            <MemorySelector />
            <KnowledgeSelector />
            <SkillsSelector />
            <ConnectorsSelector />
          </div>
        </ComposerSection>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="type-caption text-foreground-muted">Press ⌘↵ to generate</span>
          <GenerateCampaign onGenerate={onGenerate} />
        </div>
      </div>
    </div>
  );
}
