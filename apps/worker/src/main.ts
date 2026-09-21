import { parseServerEnv } from "@lex/domain";
import {
  claimNextJob,
  closeAllPools,
  completeJob,
  failJob,
  getPool,
  requesterStillAuthorised,
} from "@lex/db";
import { runJob } from "./handlers";

const env = parseServerEnv();
const url = env.WORKER_DATABASE_URL ?? env.DATABASE_URL;
const pool = getPool(url);
const LEASE_SECONDS = env.GENERATION_TIMEOUT_SECONDS + 30;
let stopping = false;

async function tick(): Promise<boolean> {
  const job = await claimNextJob(pool, LEASE_SECONDS);
  if (!job) return false;
  console.log(`[worker] claimed ${job.kind} ${job.id} attempt ${job.attempts}/${job.maxAttempts}`);
  try {
    const result = await runJob(job, env);
    // Re-check authorisation before releasing any result (A15/A23).
    if (!(await requesterStillAuthorised(pool, job))) {
      await failJob(pool, { ...job, attempts: job.maxAttempts }, {
        code: "requester_unauthorised",
        message: "Requester is no longer an active member; result withheld.",
      });
      return true;
    }
    await completeJob(pool, job.id, result);
    console.log(`[worker] succeeded ${job.id}`);
  } catch (error) {
    const err = error as Error & { code?: string };
    const outcome = await failJob(pool, job, { code: err.code ?? "job_failed", message: err.message });
    console.log(`[worker] ${outcome} ${job.id}: ${err.message}`);
  }
  return true;
}

async function loop(): Promise<void> {
  console.log(`[worker] started (env=${env.APP_ENV}, live_model=${env.LLM_PROVIDER !== "none"})`);
  while (!stopping) {
    let didWork = false;
    try {
      didWork = await tick();
    } catch (error) {
      console.error("[worker] loop error", (error as Error).message);
    }
    if (!didWork) await new Promise((r) => setTimeout(r, 1500));
  }
  await closeAllPools();
}

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });
await loop();
