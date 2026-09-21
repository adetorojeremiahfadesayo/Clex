import { z } from "zod";
import { uuidSchema } from "./company";

export const jobKinds = ["assessment", "document_parse", "analysis", "export", "noop"] as const;
export const jobKindSchema = z.enum(jobKinds);
export type JobKind = z.infer<typeof jobKindSchema>;

export const jobStatuses = ["queued", "running", "succeeded", "failed", "cancelled"] as const;
export const jobStatusSchema = z.enum(jobStatuses);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const jobSchema = z.object({
  id: uuidSchema,
  companyId: uuidSchema,
  kind: jobKindSchema,
  idempotencyKey: z.string(),
  status: jobStatusSchema,
  attempts: z.number().int(),
  maxAttempts: z.number().int(),
  payload: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()).nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  requestedBy: uuidSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Job = z.infer<typeof jobSchema>;

/** Valid transitions; anything else is rejected at the database and in code. */
export const jobTransitions: Record<JobStatus, readonly JobStatus[]> = {
  queued: ["running", "cancelled"],
  running: ["succeeded", "failed", "queued", "cancelled"],
  succeeded: [],
  failed: [],
  cancelled: [],
};

export function canTransitionJob(from: JobStatus, to: JobStatus): boolean {
  return jobTransitions[from].includes(to);
}
