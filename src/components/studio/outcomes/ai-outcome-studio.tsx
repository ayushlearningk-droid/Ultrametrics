"use client";

/**
 * Outcome Engine — composition (Sprint 63J).
 *
 * Outcome-first studio: pick an outcome → watch the OS assemble the plan. No
 * tool-first prompts. Mounts inside the shell's Workspace Region. Presentation
 * only, deterministic.
 */

import { OutcomeEngineProvider, useOutcome } from "./outcome-engine";
import { OutcomePicker } from "./outcome-picker";
import { OutcomePlan } from "./outcome-plan";

function Body() {
  const { outcome } = useOutcome();
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col px-4 py-8 md:px-10">
      {outcome ? <OutcomePlan /> : <OutcomePicker />}
    </div>
  );
}

export function AiOutcomeStudio() {
  return (
    <OutcomeEngineProvider>
      <Body />
    </OutcomeEngineProvider>
  );
}
