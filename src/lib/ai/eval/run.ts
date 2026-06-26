/**
 * AI Evaluation Suite — CLI entry (Sprint 33.5).
 *
 * Development-only runner. Execute with:  npm run ai:eval
 * Prints the report and exits non-zero when any scenario fails (CI-gate ready).
 * Never imported by the app — zero production impact.
 */

import { runEvaluation, formatReport } from "./runner";
import { runEngineEvaluation, formatEngineReport } from "./engine";
import { runCreativeEvaluation, formatCreativeReport } from "./creative";
import { runMediaBuyerEvaluation, formatMediaBuyerReport } from "./media-buyer";
import { runBrainEvaluation, formatBrainReport } from "./brain";
import {
  runCommandCenterEvaluation,
  formatCommandCenterReport,
} from "./command-center";
import { runDecisionEvaluation, formatDecisionReport } from "./decision";
import { runSkillsEvaluation, formatSkillsReport } from "./skills";
import {
  runGenerationEvaluation,
  formatGenerationReport,
} from "./generation";
import {
  runGenerationAdapterEvaluation,
  formatGenerationAdapterReport,
} from "./generation-adapters";
import {
  runGenerationOrchestratorEvaluation,
  formatGenerationOrchestratorReport,
} from "./generation-orchestrator";

function main(): number {
  const routing = runEvaluation();
  console.log(formatReport(routing));

  const engine = runEngineEvaluation();
  console.log("\n" + formatEngineReport(engine));

  const creative = runCreativeEvaluation();
  console.log("\n" + formatCreativeReport(creative));

  const mediaBuyer = runMediaBuyerEvaluation();
  console.log("\n" + formatMediaBuyerReport(mediaBuyer));

  const brain = runBrainEvaluation();
  console.log("\n" + formatBrainReport(brain));

  const commandCenter = runCommandCenterEvaluation();
  console.log("\n" + formatCommandCenterReport(commandCenter));

  const decision = runDecisionEvaluation();
  console.log("\n" + formatDecisionReport(decision));

  const skills = runSkillsEvaluation();
  console.log("\n" + formatSkillsReport(skills));

  const generation = runGenerationEvaluation();
  console.log("\n" + formatGenerationReport(generation));

  const generationAdapters = runGenerationAdapterEvaluation();
  console.log("\n" + formatGenerationAdapterReport(generationAdapters));

  const generationOrchestrator = runGenerationOrchestratorEvaluation();
  console.log("\n" + formatGenerationOrchestratorReport(generationOrchestrator));

  return routing.failed === 0 &&
    engine.failed === 0 &&
    creative.failed === 0 &&
    mediaBuyer.failed === 0 &&
    brain.failed === 0 &&
    commandCenter.failed === 0 &&
    decision.failed === 0 &&
    skills.failed === 0 &&
    generation.failed === 0 &&
    generationAdapters.failed === 0 &&
    generationOrchestrator.failed === 0
    ? 0
    : 1;
}

process.exit(main());
