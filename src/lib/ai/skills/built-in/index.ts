/**
 * AI Skills Framework — built-in skills barrel (Sprint 48).
 *
 * Deterministic ordered list of the framework's read-only skills. Each
 * delegates to an existing pure engine; none execute or call a provider.
 */

import type { BaseSkill } from "../base-skill";
import { AnalyticsSkill } from "./analytics-skill";
import { CreativeSkill } from "./creative-skill";
import { MediaBuyerSkill } from "./media-buyer-skill";
import { ReportingSkill } from "./reporting-skill";
import { WorkspaceSkill } from "./workspace-skill";

export { AnalyticsSkill } from "./analytics-skill";
export { CreativeSkill } from "./creative-skill";
export { MediaBuyerSkill } from "./media-buyer-skill";
export { ReportingSkill, type ReportOutput } from "./reporting-skill";
export { WorkspaceSkill, type WorkspaceOutput } from "./workspace-skill";

/** Deterministic registration order for the default registry. */
export const BUILT_IN_SKILLS: BaseSkill[] = [
  new AnalyticsSkill(),
  new CreativeSkill(),
  new MediaBuyerSkill(),
  new ReportingSkill(),
  new WorkspaceSkill(),
];
