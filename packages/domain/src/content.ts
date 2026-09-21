import { z } from "zod";
import { type FactKey, type FactMap, answeredNumber, answeredString, factKeySchema, factState, marketSchema } from "./facts";

/** Platform-wide roles for legal content management. Distinct from company membership roles. */
export const platformRoles = ["none", "content_editor", "content_reviewer"] as const;
export const platformRoleSchema = z.enum(platformRoles);
export type PlatformRole = z.infer<typeof platformRoleSchema>;

export const packStatuses = ["draft", "under_review", "published", "stale", "withdrawn"] as const;
export const packStatusSchema = z.enum(packStatuses);
export type PackStatus = z.infer<typeof packStatusSchema>;

export const capabilities = ["information_collection", "official_links", "reviewed_checklist", "reviewed_explanation", "reviewed_template", "document_review"] as const;
export const capabilitySchema = z.enum(capabilities);
export type Capability = z.infer<typeof capabilitySchema>;

export const matterTypes = ["formation", "employment", "supplier", "other"] as const;
export const matterTypeSchema = z.enum(matterTypes);
export type MatterType = z.infer<typeof matterTypeSchema>;

// Sources ------------------------------------------------------------------

export const sourceKinds = ["primary_law", "regulator_guidance", "official_procedure", "official_directory", "reviewer_commentary"] as const;
export const sourceInputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(80),
  market: marketSchema,
  authority: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(300),
  kind: z.enum(sourceKinds),
  permittedUse: z.string().trim().min(1).max(300),
});
export type SourceInput = z.infer<typeof sourceInputSchema>;

export const sourceVersionInputSchema = z.object({
  url: z.url().refine((u) => u.startsWith("https://"), "Sources must be https"),
  language: z.string().min(2).max(10).default("en"),
  effectiveFrom: z.iso.date().nullable().default(null),
  effectiveTo: z.iso.date().nullable().default(null),
  checkedAt: z.iso.date(),
  /** Permitted excerpt or locator notes only; never a wholesale copy of restricted material. */
  excerpt: z.string().max(4000).default(""),
  locator: z.string().max(300).default(""),
});
export type SourceVersionInput = z.infer<typeof sourceVersionInputSchema>;

// Rule DSL -----------------------------------------------------------------

export const predicateSchema = z.object({
  fact: factKeySchema,
  op: z.enum(["eq", "neq", "in", "gt", "eq_number", "answered"]),
  value: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
});
export type Predicate = z.infer<typeof predicateSchema>;

/**
 * Data-only checklist rule. `applies` predicates must all hold for `yes`; any
 * predicate whose fact is not answered makes the result `unknown`; otherwise `no`.
 * Reason templates may reference facts as {fact_key}.
 */
export const contentRuleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/).max(80),
  category: z.enum(["formation", "readiness", "people", "commercial", "data", "review"]),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  action: z.string().trim().min(1).max(300),
  applies: z.array(predicateSchema).min(1),
  reasonWhenYes: z.string().trim().min(1).max(600),
  reasonWhenNo: z.string().trim().min(1).max(600),
  reasonWhenUnknown: z.string().trim().min(1).max(600),
  gather: z.array(z.string().max(200)).default([]),
  prerequisites: z.array(z.string()).default([]),
  /** Source slugs from the same pack version's sourceRefs; every rule must cite at least one. */
  sourceSlugs: z.array(z.string()).min(1),
  followUpFacts: z.array(factKeySchema).default([]),
});
export type ContentRule = z.infer<typeof contentRuleSchema>;

export const templateVariableSchema = z.object({
  name: z.string().regex(/^[a-z_]+$/),
  label: z.string().min(1).max(120),
  required: z.boolean().default(true),
  fromFact: factKeySchema.optional(),
});

export const contentTemplateSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/).max(80),
  matterType: matterTypeSchema,
  title: z.string().min(1).max(200),
  variables: z.array(templateVariableSchema),
  /** Body with {{variable}} slots. Unfilled required slots block "ready for signature" (M4). */
  body: z.string().min(1).max(50_000),
  permittedModifications: z.string().max(1000).default(""),
  sourceSlugs: z.array(z.string()).min(1),
});
export type ContentTemplate = z.infer<typeof contentTemplateSchema>;

export const packVersionContentSchema = z.object({
  subdivisions: z.array(z.string().max(80)).default([]),
  matterTypes: z.array(matterTypeSchema).min(1),
  entityTypes: z.array(z.string()).default([]),
  excludedTopics: z.array(z.string().max(200)).default([]),
  languages: z.array(z.string()).default(["en"]),
  capabilities: z.array(capabilitySchema).min(1),
  sourceRefs: z.array(z.object({ slug: z.string(), versionId: z.uuid().nullable().default(null) })).min(1),
  rules: z.array(contentRuleSchema),
  templates: z.array(contentTemplateSchema).default([]),
  effectiveFrom: z.iso.date().nullable().default(null),
  effectiveTo: z.iso.date().nullable().default(null),
  reviewDueAt: z.iso.date().nullable().default(null),
  notes: z.string().max(4000).default(""),
}).superRefine((c, ctx) => {
  const slugs = new Set(c.sourceRefs.map((s) => s.slug));
  c.rules.forEach((r, i) => {
    for (const s of r.sourceSlugs) if (!slugs.has(s)) ctx.addIssue({ code: "custom", path: ["rules", i, "sourceSlugs"], message: `Rule ${r.id} cites source "${s}" that is not in sourceRefs` });
  });
  c.templates.forEach((t, i) => {
    for (const s of t.sourceSlugs) if (!slugs.has(s)) ctx.addIssue({ code: "custom", path: ["templates", i, "sourceSlugs"], message: `Template ${t.id} cites source "${s}" that is not in sourceRefs` });
    const slots = [...t.body.matchAll(/\{\{([a-z_]+)\}\}/g)].map((m) => m[1]!);
    const names = new Set(t.variables.map((v) => v.name));
    for (const s of slots) if (!names.has(s)) ctx.addIssue({ code: "custom", path: ["templates", i, "body"], message: `Template ${t.id} uses undeclared slot {{${s}}}` });
  });
  if (c.capabilities.includes("reviewed_checklist") && c.rules.length === 0) ctx.addIssue({ code: "custom", path: ["rules"], message: "reviewed_checklist requires at least one rule" });
  if (c.capabilities.includes("reviewed_template") && c.templates.length === 0) ctx.addIssue({ code: "custom", path: ["templates"], message: "reviewed_template requires at least one template" });
  const ids = c.rules.map((r) => r.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["rules"], message: "Duplicate rule ids" });
});
export type PackVersionContent = z.infer<typeof packVersionContentSchema>;

export const packSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  market: marketSchema,
  title: z.string(),
  createdBy: z.uuid(),
  createdAt: z.string(),
});
export type Pack = z.infer<typeof packSchema>;

export const packVersionSchema = z.object({
  id: z.uuid(),
  packId: z.uuid(),
  version: z.number().int().positive(),
  status: packStatusSchema,
  content: packVersionContentSchema,
  contentHash: z.string(),
  authorId: z.uuid(),
  reviewerId: z.uuid().nullable(),
  reviewedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  statusReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PackVersion = z.infer<typeof packVersionSchema>;

export const packTransitions: Record<PackStatus, readonly PackStatus[]> = {
  draft: ["under_review", "withdrawn"],
  under_review: ["published", "draft", "withdrawn"],
  published: ["stale", "withdrawn"],
  stale: ["withdrawn"],
  withdrawn: [],
};

// Evaluation cases -----------------------------------------------------------

export const evalCaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/).max(80),
  title: z.string().min(1).max(200),
  kind: z.enum(["normal", "missing_information", "out_of_scope", "conflict", "outdated_source"]),
  facts: z.record(z.string(), z.object({ state: z.enum(["answered", "unknown", "skipped"]), value: z.union([z.string(), z.number()]).optional() })),
  expected: z.record(z.string(), z.enum(["yes", "no", "unknown"])),
  /** Claims a reviewer marked as unacceptable; output text containing them fails. */
  unacceptableClaims: z.array(z.string()).default([]),
});
export type EvalCase = z.infer<typeof evalCaseSchema>;

// Interpreter ----------------------------------------------------------------

export interface RuleOutcome {
  applicability: "yes" | "no" | "unknown";
  reason: string;
  factKeysUsed: FactKey[];
  missingFactKeys: FactKey[];
}

function holds(facts: FactMap, p: Predicate): boolean | null {
  if (p.op === "answered") return factState(facts, p.fact) === "answered";
  if (factState(facts, p.fact) !== "answered") return null;
  const s = answeredString(facts, p.fact);
  const n = answeredNumber(facts, p.fact);
  switch (p.op) {
    case "eq": return s === String(p.value);
    case "neq": return s !== String(p.value);
    case "in": return Array.isArray(p.value) && s !== undefined && p.value.includes(s);
    case "gt": return n !== undefined && n > Number(p.value);
    case "eq_number": return n !== undefined && n === Number(p.value);
  }
}

function fill(template: string, facts: FactMap): string {
  return template.replace(/\{([a-z_]+)\}/g, (_, key: string) => {
    const s = answeredString(facts, key as FactKey);
    return s ?? (factState(facts, key as FactKey) === "unknown" ? "not sure" : "not recorded");
  });
}

export function evaluateContentRule(rule: ContentRule, facts: FactMap): RuleOutcome {
  const used: FactKey[] = [];
  const missing: FactKey[] = [];
  let anyFalse = false;
  for (const p of rule.applies) {
    const h = holds(facts, p);
    if (h === null) missing.push(p.fact);
    else {
      used.push(p.fact);
      if (!h) anyFalse = true;
    }
  }
  if (anyFalse) return { applicability: "no", reason: fill(rule.reasonWhenNo, facts), factKeysUsed: used, missingFactKeys: [] };
  if (missing.length) return { applicability: "unknown", reason: fill(rule.reasonWhenUnknown, facts), factKeysUsed: used, missingFactKeys: [...new Set(missing)] };
  const followUps = rule.followUpFacts.filter((k) => factState(facts, k) !== "answered");
  return { applicability: "yes", reason: fill(rule.reasonWhenYes, facts), factKeysUsed: used, missingFactKeys: followUps };
}
