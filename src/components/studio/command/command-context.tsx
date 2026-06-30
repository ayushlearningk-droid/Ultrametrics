"use client";

/**
 * AI Studio Command Center — tool state (Sprint 63).
 *
 * Holds command-center-specific selections (model · voice · knowledge · skills ·
 * connectors · workspace memory) and attachments. The outcome/brand/offer live
 * in the reused Prompt Composer state. Presentation only.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export interface Attachment {
  id: string;
  name: string;
  kind: "image" | "video" | "url" | "text";
}

interface CommandState {
  model: string;
  voice: string;
  knowledge: string[];
  skills: string[];
  connectors: string[];
  memory: string[];
  attachments: Attachment[];
  setModel: (id: string) => void;
  setVoice: (id: string) => void;
  toggleKnowledge: (id: string) => void;
  toggleSkill: (id: string) => void;
  toggleConnector: (id: string) => void;
  toggleMemory: (id: string) => void;
  addAttachment: (a: Omit<Attachment, "id">) => void;
  removeAttachment: (id: string) => void;
}

const CommandContext = createContext<CommandState | null>(null);

let seq = 0;

export function CommandProvider({ children }: { children: React.ReactNode }) {
  const [model, setModel] = useState("auto");
  const [voice, setVoice] = useState("none");
  const [knowledge, setKnowledge] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [connectors, setConnectors] = useState<string[]>([]);
  const [memory, setMemory] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const toggle = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
      setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    []
  );

  const value = useMemo<CommandState>(
    () => ({
      model,
      voice,
      knowledge,
      skills,
      connectors,
      memory,
      attachments,
      setModel,
      setVoice,
      toggleKnowledge: toggle(setKnowledge),
      toggleSkill: toggle(setSkills),
      toggleConnector: toggle(setConnectors),
      toggleMemory: toggle(setMemory),
      addAttachment: (a) => setAttachments((prev) => [...prev, { ...a, id: `att-${seq++}` }]),
      removeAttachment: (id) => setAttachments((prev) => prev.filter((x) => x.id !== id)),
    }),
    [model, voice, knowledge, skills, connectors, memory, attachments, toggle]
  );

  return <CommandContext.Provider value={value}>{children}</CommandContext.Provider>;
}

export function useCommand(): CommandState {
  const ctx = useContext(CommandContext);
  if (!ctx) throw new Error("useCommand must be used within a CommandProvider");
  return ctx;
}
