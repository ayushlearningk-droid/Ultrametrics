/**
 * AI Evaluation Suite — CLI entry (Sprint 33.5).
 *
 * Development-only runner. Execute with:  npm run ai:eval
 * Prints the report and exits non-zero when any scenario fails (CI-gate ready).
 * Never imported by the app — zero production impact.
 */

import { runEvaluation, formatReport } from "./runner";
import { runEngineEvaluation, formatEngineReport } from "./engine";

function main(): number {
  const routing = runEvaluation();
  console.log(formatReport(routing));

  const engine = runEngineEvaluation();
  console.log("\n" + formatEngineReport(engine));

  return routing.failed === 0 && engine.failed === 0 ? 0 : 1;
}

process.exit(main());
