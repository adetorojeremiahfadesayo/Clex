import type { Job, JobKind } from "@lex/domain";
import type { Queryable } from "../pool";

interface JobRow {
  id: string;
  company_id: string;
  kind: JobKind;
  idempotency_key: string;
  status: Job["status"];
  attempts: number;
  max_attempts: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  requested_by: string;
  created_at: Date;
  updated_at: Date;
}

const jobColumns =
  "id, company_id, kind, idempotency_key, status, attempts, max_attempts, payload, result, error_code, error_message, requested_by, created_at, updated_at";
const jobColumnsOf = (alias: string) =>
  jobColumns.split(", ").map((c) => `${alias}.${c}`).join(", ");

function toJob(r: JobRow): Job {
  return {
    id: r.id,
    companyId: r.company_id,
    kind: r.kind,
    idempotencyKey: r.idempotency_key,
    status: r.status,
    attempts: r.attempts,
    maxAttempts: r.max_attempts,
    payload: r.payload,
    result: r.result,
    errorCode: r.error_code,
    errorMessage: r.error_message,
    requestedBy: r.requested_by,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

/** Idempotent enqueue: an existing job with the same key is returned unchanged. */
export async function enqueueJob(
  db: Queryable,
  input: {
    companyId: string;
    kind: JobKind;
    idempotencyKey: string;
    payload: Record<string, unknown>;
    requestedBy: string;
    maxAttempts: number;
  },
): Promise<Job> {
  const { rows } = await db.query<JobRow>(
    `insert into jobs (company_id, kind, idempotency_key, payload, requested_by, max_attempts)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (company_id, idempotency_key) do update set updated_at = jobs.updated_at
     returning ${jobColumns}`,
    [input.companyId, input.kind, input.idempotencyKey, input.payload, input.requestedBy, input.maxAttempts],
  );
  return toJob(rows[0]!);
}

export async function getJob(db: Queryable, jobId: string): Promise<Job | null> {
  const { rows } = await db.query<JobRow>(`select ${jobColumns} from jobs where id = $1`, [jobId]);
  return rows[0] ? toJob(rows[0]) : null;
}

export async function listJobs(db: Queryable, companyId: string): Promise<Job[]> {
  const { rows } = await db.query<JobRow>(
    `select ${jobColumns} from jobs where company_id = $1 order by created_at desc limit 50`,
    [companyId],
  );
  return rows.map(toJob);
}

export async function cancelJob(db: Queryable, jobId: string): Promise<Job | null> {
  const { rows } = await db.query<JobRow>(
    `update jobs set status = 'cancelled' where id = $1 and status in ('queued','running') returning ${jobColumns}`,
    [jobId],
  );
  return rows[0] ? toJob(rows[0]) : null;
}

// Worker-side operations (BYPASSRLS connection) ---------------------------

export async function claimNextJob(db: Queryable, leaseSeconds: number): Promise<Job | null> {
  const { rows } = await db.query<JobRow>(
    `with candidate as (
       select id from jobs
        where status = 'queued'
           or (status = 'running' and lease_expires_at < now())
        order by created_at
        for update skip locked
        limit 1
     )
     update jobs j
        set status = 'running',
            attempts = j.attempts + 1,
            lease_expires_at = now() + ($1 || ' seconds')::interval,
            heartbeat_at = now()
       from candidate
      where j.id = candidate.id
      returning ${jobColumnsOf("j")}`,
    [String(leaseSeconds)],
  );
  return rows[0] ? toJob(rows[0]) : null;
}

/** A15/A23: the requester must still be an active member when a result is released. */
export async function requesterStillAuthorised(db: Queryable, job: Job): Promise<boolean> {
  const { rows } = await db.query<{ ok: boolean }>(
    `select exists (
       select 1 from memberships
        where company_id = $1 and user_id = $2 and revoked_at is null and accepted_at is not null
     ) as ok`,
    [job.companyId, job.requestedBy],
  );
  return rows[0]?.ok ?? false;
}

export async function completeJob(db: Queryable, jobId: string, result: Record<string, unknown>): Promise<void> {
  await db.query("update jobs set status = 'succeeded', result = $2, lease_expires_at = null where id = $1", [
    jobId,
    result,
  ]);
}

export async function failJob(
  db: Queryable,
  job: Job,
  error: { code: string; message: string },
): Promise<"retried" | "failed"> {
  const retry = job.attempts < job.maxAttempts;
  await db.query(
    `update jobs set status = $2, error_code = $3, error_message = $4, lease_expires_at = null where id = $1`,
    [job.id, retry ? "queued" : "failed", error.code, error.message.slice(0, 2000)],
  );
  return retry ? "retried" : "failed";
}
