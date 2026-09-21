import type { Job, ServerEnv } from "@lex/domain";

export class JobError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

/**
 * Dispatch by job kind. Only `noop` exists in M0; later milestones add parsing,
 * assessment and analysis. Unknown kinds fail visibly rather than pretending success.
 */
export async function runJob(job: Job, _env: ServerEnv): Promise<Record<string, unknown>> {
  switch (job.kind) {
    case "noop": {
      if (job.payload["failUntilAttempt"] !== undefined && job.attempts < Number(job.payload["failUntilAttempt"])) {
        throw new JobError("simulated_failure", `Simulated failure on attempt ${job.attempts}`);
      }
      return { echoed: job.payload["message"] ?? null, processedAt: new Date().toISOString() };
    }
    default:
      throw new JobError("unsupported_job_kind", `No handler implemented for job kind "${job.kind}" yet`);
  }
}
