import { z } from "zod";

export const matterKinds = ["employment", "supplier", "other"] as const;
export const matterKindSchema = z.enum(matterKinds);
export type MatterKind = z.infer<typeof matterKindSchema>;

export const createMatterSchema = z.object({
  kind: matterKindSchema,
  title: z.string().trim().min(2).max(200),
  summary: z.string().trim().max(4000).default(""),
  context: z.object({
    role: z.string().trim().max(160).optional(),
    counterparty: z.string().trim().max(200).optional(),
    workLocation: z.string().trim().max(160).optional(),
    governingLaw: z.string().trim().max(160).optional(),
    payment: z.string().trim().max(300).optional(),
    dataAccess: z.string().trim().max(300).optional(),
    deliverables: z.string().trim().max(1000).optional(),
    question: z.string().trim().max(4000).optional(),
  }).default({}),
});
export type CreateMatterInput = z.infer<typeof createMatterSchema>;

export const findingSchema = z.object({
  kind: z.enum(["observation", "question", "suggestion"]),
  title: z.string().trim().min(1).max(180),
  explanation: z.string().trim().min(1).max(1500),
  companyReason: z.string().trim().min(1).max(800),
  documentExcerpt: z.string().max(600).nullable(),
  sourceType: z.enum(["document", "company_profile", "matter_context"]),
});
export type Finding = z.infer<typeof findingSchema>;

export const analysisOutputSchema = z.object({
  findings: z.array(findingSchema).max(12),
  questions: z.array(z.string().trim().min(1).max(500)).max(12),
});
export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;
