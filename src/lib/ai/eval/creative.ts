/**
 * AI Evaluation Suite — Creative Intelligence checks (Sprint 35).
 *
 * Deterministic property checks over the Creative Intelligence / Strategy /
 * Brief engines using representative eval FIXTURES (pure-function inputs, not
 * production data). Verifies fatigue detection, hook/CTA/offer/audience
 * diagnosis, strategy mapping, brief grounding, and the no-invention contract.
 */

import type { CreativeInput } from "../creative/types";
import { computeCreativeSignals } from "../creative/intelligence";
import { generateStrategy } from "../creative/strategy";
import { generateCreativeBrief } from "../creative/brief";

export interface CreativeCheck {
  name: string;
  pass: boolean;
  detail: string;
}
export interface CreativeSummary {
  total: number;
  passed: number;
  failed: number;
  results: CreativeCheck[];
}

function check(name: string, pass: boolean, detail: string): CreativeCheck {
  return { name, pass, detail };
}

export function runCreativeEvaluation(): CreativeSummary {
  const results: CreativeCheck[] = [];

  // 1. Creative fatigue: high frequency + declining CTR.
  {
    const input: CreativeInput = {
      frequency: 4.2,
      ctrTrend: "declining",
      causes: ["creative_fatigue"],
      spend: 5000,
    };
    const s = computeCreativeSignals(input);
    const st = generateStrategy(s);
    results.push(
      check(
        "Creative fatigue: high score + refresh strategy",
        s.fatigueScore >= 60 &&
          st.actions.includes("Different Angle") &&
          st.angles.includes("UGC") &&
          st.actions.includes("Test Recommendation"),
        `fatigue=${s.fatigueScore} actions=${st.actions.join(",")}`
      )
    );
  }

  // 2. Weak hook: declining CTR + low_ctr cause.
  {
    const s = computeCreativeSignals({ ctrTrend: "declining", causes: ["low_ctr"] });
    const st = generateStrategy(s);
    results.push(
      check(
        "Weak hook: detected + hook strategy",
        s.hookQuality === "weak" &&
          st.actions.includes("Replace hook") &&
          st.actions.includes("Change first 3 seconds"),
        `hook=${s.hookQuality} actions=${st.actions.join(",")}`
      )
    );
  }

  // 3. High frequency → fatigue + audience saturation.
  {
    const s = computeCreativeSignals({ frequency: 5.5 });
    results.push(
      check(
        "High frequency: fatigue + audience weak",
        s.fatigueScore > 0 && s.audienceMatch === "weak",
        `fatigue=${s.fatigueScore} audience=${s.audienceMatch}`
      )
    );
  }

  // 4. Declining CTR → weak hook (without explicit cause).
  {
    const s = computeCreativeSignals({ ctrTrend: "declining", ctr: 0.008 });
    results.push(
      check(
        "Declining CTR: hook weak",
        s.hookQuality === "weak",
        `hook=${s.hookQuality}`
      )
    );
  }

  // 5. Offer mismatch: clicks fine, zero conversions / offer cause.
  {
    const s = computeCreativeSignals({
      ctrTrend: "stable",
      spend: 3000,
      conversions: 0,
      causes: ["offer_mismatch"],
    });
    const st = generateStrategy(s);
    results.push(
      check(
        "Offer mismatch: offer weak + New Offer",
        s.offerMatch === "weak" && st.actions.includes("New Offer"),
        `offer=${s.offerMatch} actions=${st.actions.join(",")}`
      )
    );
  }

  // 6. Audience mismatch: saturation cause → audience weak + Different Angle.
  {
    const s = computeCreativeSignals({ causes: ["audience_saturation"] });
    const st = generateStrategy(s);
    results.push(
      check(
        "Audience mismatch: audience weak + Different Angle",
        s.audienceMatch === "weak" && st.actions.includes("Different Angle"),
        `audience=${s.audienceMatch} actions=${st.actions.join(",")}`
      )
    );
  }

  // 7. Grounding: brief evidence uses only provided metrics; no invented %.
  {
    const input: CreativeInput = { roas: 2.1, ctr: 0.012, frequency: 4.0, ctrTrend: "declining", causes: ["creative_fatigue"] };
    const brief = generateCreativeBrief(input);
    const noInventedConversions = !brief.evidence.some((e) => /conversion/i.test(e));
    results.push(
      check(
        "Brief grounding: evidence only from provided metrics",
        brief.evidence.some((e) => e.includes("ROAS 2.10")) &&
          brief.evidence.some((e) => e.includes("CTR 1.20%")) &&
          noInventedConversions &&
          brief.successMetric.length > 0,
        brief.evidence.join(" · ")
      )
    );
  }

  // 8. Sparse input → low confidence, no fabricated weakness.
  {
    const s = computeCreativeSignals({ roas: 3.0 });
    results.push(
      check(
        "Sparse input: low confidence, visual unknown",
        s.confidence === "low" && s.visualQuality === "unknown",
        `confidence=${s.confidence} visual=${s.visualQuality}`
      )
    );
  }

  const passed = results.filter((c) => c.pass).length;
  return { total: results.length, passed, failed: results.length - passed, results };
}

export function formatCreativeReport(summary: CreativeSummary): string {
  const L: string[] = [];
  L.push("══════════════════════════════════════════════════════════════");
  L.push("  CREATIVE INTELLIGENCE EVALUATION (deterministic)");
  L.push("══════════════════════════════════════════════════════════════");
  L.push(`  Checks: ${summary.passed}/${summary.total} passed`);
  L.push("");
  for (const c of summary.results) {
    L.push(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
    if (!c.pass) L.push(`        ${c.detail}`);
  }
  L.push("");
  L.push(`  RESULT: ${summary.failed === 0 ? "PASS" : "FAIL"}`);
  L.push("──────────────────────────────────────────────────────────────");
  return L.join("\n");
}
