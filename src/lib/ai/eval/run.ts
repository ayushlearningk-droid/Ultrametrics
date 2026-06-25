/**
 * AI Evaluation Suite — CLI entry (Sprint 33.5).
 *
 * Development-only runner. Execute with:  npm run ai:eval
 * Prints the report and exits non-zero when any scenario fails (CI-gate ready).
 * Never imported by the app — zero production impact.
 */

import { runEvaluation, formatReport } from "./runner";

function main(): number {
  const summary = runEvaluation();
  console.log(formatReport(summary));
  return summary.failed === 0 ? 0 : 1;
}

process.exit(main());
