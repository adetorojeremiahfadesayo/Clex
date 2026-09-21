import { z } from "zod";

/** Provenance of a recorded fact. User-confirmed is not government-verified. */
export const factProvenances = ["user_asserted", "extracted_unconfirmed", "user_confirmed", "reviewer_confirmed"] as const;
export const factProvenanceSchema = z.enum(factProvenances);
export type FactProvenance = z.infer<typeof factProvenanceSchema>;

export const markets = ["NG", "GB", "US", "EU", "CN"] as const;
export const marketSchema = z.enum(markets);
export type Market = z.infer<typeof marketSchema>;

export const marketLabels: Record<Market, string> = {
  NG: "Nigeria",
  GB: "United Kingdom",
  US: "United States",
  EU: "European country",
  CN: "China",
};

/** Every fact the intake can record. Keys are stable identifiers stored in revisions. */
export const factKeys = [
  "registration_status",
  "legal_form",
  "registration_number",
  "registration_evidence",
  "formation_country",
  "formation_subdivision",
  "operating_locations",
  "worker_locations",
  "customer_markets",
  "industry",
  "activities",
  "customer_type",
  "regulated_activity",
  "founder_count",
  "employee_count",
  "contractor_count",
  "hiring_plan",
  "has_suppliers",
  "customer_data",
  "online_sales",
  "has_adviser",
  "current_priority",
] as const;
export const factKeySchema = z.enum(factKeys);
export type FactKey = z.infer<typeof factKeySchema>;

/**
 * A recorded answer. `unknown` and `skipped` are first-class states so that a
 * missing answer is never treated as "no" (A03).
 */
export const factValueSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("answered"), value: z.union([z.string().trim().min(1).max(500), z.number().int().min(0).max(1_000_000)]) }),
  z.object({ state: z.literal("unknown") }),
  z.object({ state: z.literal("skipped") }),
]);
export type FactValue = z.infer<typeof factValueSchema>;

export const recordedFactSchema = z.object({
  value: factValueSchema,
  provenance: factProvenanceSchema,
  recordedAt: z.string(),
  recordedBy: z.uuid(),
  sourceDocumentVersionId: z.uuid().nullable().default(null),
});
export type RecordedFact = z.infer<typeof recordedFactSchema>;

export const factMapSchema = z.partialRecord(factKeySchema, recordedFactSchema);
export type FactMap = z.infer<typeof factMapSchema>;

export const profileRevisionSchema = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  version: z.number().int().positive(),
  previousRevisionId: z.uuid().nullable(),
  facts: factMapSchema,
  confirmedBy: z.uuid(),
  reason: z.string(),
  createdAt: z.string(),
});
export type ProfileRevision = z.infer<typeof profileRevisionSchema>;

/** Input for confirming a set of answers as a new revision. */
export const confirmAnswersInputSchema = z.object({
  answers: z.partialRecord(factKeySchema, factValueSchema).refine((a) => Object.keys(a).length > 0, "At least one answer is required"),
  reason: z.string().trim().min(1).max(300).default("Intake answers confirmed"),
});
export type ConfirmAnswersInput = z.infer<typeof confirmAnswersInputSchema>;

export function answeredValue(facts: FactMap, key: FactKey): string | number | undefined {
  const f = facts[key];
  return f?.value.state === "answered" ? f.value.value : undefined;
}

export function answeredString(facts: FactMap, key: FactKey): string | undefined {
  const v = answeredValue(facts, key);
  return typeof v === "string" ? v : v === undefined ? undefined : String(v);
}

export function answeredNumber(facts: FactMap, key: FactKey): number | undefined {
  const v = answeredValue(facts, key);
  return typeof v === "number" ? v : undefined;
}

export function factState(facts: FactMap, key: FactKey): "answered" | "unknown" | "skipped" | "missing" {
  return facts[key]?.value.state ?? "missing";
}

/** Merge new answers into an existing fact map, producing the next snapshot. */
export function applyAnswers(
  current: FactMap,
  answers: Partial<Record<FactKey, FactValue>>,
  actor: { userId: string; provenance: FactProvenance; at: string },
): FactMap {
  const next: FactMap = { ...current };
  for (const [key, value] of Object.entries(answers) as [FactKey, FactValue][]) {
    if (!value) continue;
    next[key] = {
      value,
      provenance: actor.provenance,
      recordedAt: actor.at,
      recordedBy: actor.userId,
      sourceDocumentVersionId: null,
    };
  }
  return next;
}
