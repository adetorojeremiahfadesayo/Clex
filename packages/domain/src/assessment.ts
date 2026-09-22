import { z } from "zod";
import { factKeySchema } from "./facts";

export const applicabilitySchema = z.enum(["yes", "no", "unknown"]);
export type Applicability = z.infer<typeof applicabilitySchema>;

export const ruleDecisionSchema = z.object({
  ruleId: z.string(),
  ruleVersion: z.string(),
  applicability: applicabilitySchema,
  /** Plain-language reason tied to this company's recorded facts. */
  reason: z.string(),
  factKeysUsed: z.array(factKeySchema),
  missingFactKeys: z.array(factKeySchema),
});
export type RuleDecision = z.infer<typeof ruleDecisionSchema>;

export const coverageSchema = z.object({
  market: z.string().nullable(),
  subdivision: z.string().nullable(),
  packId: z.string().nullable(),
  packVersionId: z.string().nullable().default(null),
  packVersion: z.number().int().nullable().default(null),
  packStatus: z.enum(["none", "research_pointers", "draft", "under_review", "published", "stale", "withdrawn"]),
  capabilities: z.array(z.enum(["information_collection", "official_links", "reviewed_checklist", "reviewed_explanation", "reviewed_template", "document_review"])),
  notice: z.string(),
});
export type Coverage = z.infer<typeof coverageSchema>;

export const assessmentResultSchema = z.object({
  /** Which content produced this: synthetic starter rules or a published reviewed pack. Never a live model claim. */
  mode: z.enum(["synthetic_demo", "reviewed_pack"]),
  contentVersion: z.string(),
  confirmedFactKeys: z.array(factKeySchema),
  unknownFactKeys: z.array(factKeySchema),
  missingFactKeys: z.array(factKeySchema),
  decisions: z.array(ruleDecisionSchema),
  coverage: coverageSchema,
});
export type AssessmentResult = z.infer<typeof assessmentResultSchema>;

export const assessmentSchema = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  profileRevisionId: z.uuid(),
  result: assessmentResultSchema,
  generatedAt: z.string(),
});
export type Assessment = z.infer<typeof assessmentSchema>;
