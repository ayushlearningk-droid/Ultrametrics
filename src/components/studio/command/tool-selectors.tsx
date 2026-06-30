"use client";

/**
 * AI Studio Command Center — tool selectors (Sprint 63).
 * Reuses the Prompt Composer primitives (ChipSelect / ComposerField). Single
 * for model/voice; multi for knowledge/skills/connectors/memory. No duplicated
 * control UI.
 */

import { cn } from "@/lib/utils";
import { ChipSelect, ComposerField, type FieldSeams } from "@/components/studio/composer/composer-primitives";
import { useCommand } from "./command-context";
import {
  MODEL_OPTIONS,
  VOICE_OPTIONS,
  KNOWLEDGE_OPTIONS,
  SKILL_OPTIONS,
  CONNECTOR_OPTIONS,
  MEMORY_OPTIONS,
  type ToolOption,
} from "./command-data";

const SEAMS: FieldSeams = { ai: true };

export function MultiChipSelect({
  label,
  options,
  values,
  onToggle,
  seams,
}: {
  label: string;
  options: ToolOption[];
  values: string[];
  onToggle: (id: string) => void;
  seams?: FieldSeams;
}) {
  return (
    <ComposerField label={label} seams={seams}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = values.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(o.id)}
              className={cn(
                "studio-focusable rounded-full border px-2.5 py-1 type-caption transition-colors",
                active ? "border-brand/40 bg-brand/10 text-brand" : "border-white/[0.08] text-foreground-muted hover:bg-white/[0.05] hover:text-foreground"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </ComposerField>
  );
}

export function ModelSelector() {
  const { model, setModel } = useCommand();
  return <ChipSelect label="Model" options={MODEL_OPTIONS} value={model} onChange={setModel} seams={SEAMS} />;
}

export function VoiceSelector() {
  const { voice, setVoice } = useCommand();
  return <ChipSelect label="Voice" options={VOICE_OPTIONS} value={voice} onChange={setVoice} seams={SEAMS} />;
}

export function KnowledgeSelector() {
  const { knowledge, toggleKnowledge } = useCommand();
  return <MultiChipSelect label="Knowledge" options={KNOWLEDGE_OPTIONS} values={knowledge} onToggle={toggleKnowledge} seams={SEAMS} />;
}

export function SkillsSelector() {
  const { skills, toggleSkill } = useCommand();
  return <MultiChipSelect label="Skills" options={SKILL_OPTIONS} values={skills} onToggle={toggleSkill} seams={SEAMS} />;
}

export function ConnectorsSelector() {
  const { connectors, toggleConnector } = useCommand();
  return <MultiChipSelect label="Connectors" options={CONNECTOR_OPTIONS} values={connectors} onToggle={toggleConnector} seams={SEAMS} />;
}

export function MemorySelector() {
  const { memory, toggleMemory } = useCommand();
  return <MultiChipSelect label="Workspace memory" options={MEMORY_OPTIONS} values={memory} onToggle={toggleMemory} seams={SEAMS} />;
}
