import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withActor } from "../src/tenant";
import { claimNextJob, completeJob, enqueueJob, failJob, getJob, requesterStillAuthorised } from "../src/repositories/jobs";
import { hasDb, makeTenant, pools } from "./helpers";

describe.skipIf(!hasDb)("durable job queue", () => {
  const p = pools();
  let t: Awaited<ReturnType<typeof makeTenant>>;

  beforeAll(async () => {
    t = await makeTenant(p.app, "queue");
  });
  afterAll(async () => {
    await Promise.all([p.admin.end(), p.app.end(), p.worker.end()]);
  });

  const enqueue = (key: string, payload: Record<string, unknown> = {}) =>
    withActor(p.app, t.user.id, (db) =>
      enqueueJob(db, { companyId: t.company.id, kind: "noop", idempotencyKey: key, payload, requestedBy: t.user.id, maxAttempts: 2 }),
    );

  it("A20: same idempotency key returns the same job", async () => {
    const first = await enqueue("idem");
    const second = await enqueue("idem", { different: true });
    expect(second.id).toBe(first.id);
    expect(second.payload).toEqual({});
  });

  it("worker claims, retries on failure, then fails terminally", async () => {
    const job = await enqueue("retry");
    const claimed = await claimNextJobFor(job.id);
    expect(claimed.status).toBe("running");
    expect(claimed.attempts).toBe(1);
    expect(await failJob(p.worker, claimed, { code: "boom", message: "first" })).toBe("retried");
    const reclaimed = await claimNextJobFor(job.id);
    expect(reclaimed.attempts).toBe(2);
    expect(await failJob(p.worker, reclaimed, { code: "boom", message: "second" })).toBe("failed");
    const final = await withActor(p.app, t.user.id, (db) => getJob(db, job.id));
    expect(final).toMatchObject({ status: "failed", errorCode: "boom", errorMessage: "second" });
  });

  it("terminal jobs cannot transition again (database-enforced)", async () => {
    const job = await enqueue("terminal");
    const claimed = await claimNextJobFor(job.id);
    await completeJob(p.worker, claimed.id, { ok: true });
    await expect(p.worker.query("update jobs set status = 'running' where id = $1", [job.id])).rejects.toThrow(/terminal/);
    await expect(p.worker.query("update jobs set status = 'failed' where id = $1", [job.id])).rejects.toThrow(/terminal/);
  });

  it("queued jobs cannot jump straight to succeeded", async () => {
    const job = await enqueue("skip");
    await expect(p.worker.query("update jobs set status = 'succeeded' where id = $1", [job.id])).rejects.toThrow(/invalid job transition/);
  });

  it("A15/A23: worker detects revoked requester before releasing results", async () => {
    const job = await enqueue("revoked");
    const claimed = await claimNextJobFor(job.id);
    expect(await requesterStillAuthorised(p.worker, claimed)).toBe(true);
    await p.admin.query("update memberships set revoked_at = now() where company_id = $1 and user_id = $2", [t.company.id, t.user.id]);
    expect(await requesterStillAuthorised(p.worker, claimed)).toBe(false);
    await p.admin.query("update memberships set revoked_at = null where company_id = $1 and user_id = $2", [t.company.id, t.user.id]);
  });

  async function claimNextJobFor(id: string) {
    // Drain until the target job is claimed; other tests may have queued jobs.
    for (let i = 0; i < 20; i += 1) {
      const job = await claimNextJob(p.worker, 60);
      if (!job) break;
      if (job.id === id) return job;
      await completeJob(p.worker, job.id, { drained: true });
    }
    throw new Error(`job ${id} was not claimable`);
  }
});
