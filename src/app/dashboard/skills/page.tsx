/**
 * AI Skills Marketplace — page (Sprint 49).
 *
 * Reads the Skills Registry (Sprint 48) as the ONLY source of truth and renders
 * the premium marketplace. Catalog/presentation only — no execution, no
 * connectors, no DB, no API. The registry descriptors are plain serializable
 * objects, passed to the client surface.
 */

import { createDefaultRegistry } from "@/lib/ai/skills";
import { SkillsMarketplace } from "@/components/dashboard/skills-marketplace";

export const metadata = { title: "Skills" };

export default function SkillsPage() {
  // Single source of truth: the descriptors registered in the Skills Registry.
  const skills = createDefaultRegistry().describeAll();
  return <SkillsMarketplace skills={skills} />;
}
