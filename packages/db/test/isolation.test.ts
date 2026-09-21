import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withActor } from "../src/tenant";
import { getCompany, listCompanies, listMemberships } from "../src/repositories/companies";
import { enqueueJob, getJob, listJobs, cancelJob } from "../src/repositories/jobs";
import { hasDb, makeTenant, pools } from "./helpers";

describe.skipIf(!hasDb)("A14 company isolation at the database boundary", () => {
  const p = pools();
  let a: Awaited<ReturnType<typeof makeTenant>>;
  let b: Awaited<ReturnType<typeof makeTenant>>;

  beforeAll(async () => {
    a = await makeTenant(p.app, "alpha");
    b = await makeTenant(p.app, "beta");
  });
  afterAll(async () => {
    await Promise.all([p.admin.end(), p.app.end(), p.worker.end()]);
  });

  it("creates company and owner membership atomically", async () => {
    const members = await withActor(p.app, a.user.id, (db) => listMemberships(db, a.company.id));
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ userId: a.user.id, role: "owner" });
  });

  it("lists only the actor's companies", async () => {
    const mine = await withActor(p.app, a.user.id, (db) => listCompanies(db));
    expect(mine.map((c) => c.id)).toEqual([a.company.id]);
  });

  it("denies reading another company by guessed ID with no metadata leak", async () => {
    const company = await withActor(p.app, a.user.id, (db) => getCompany(db, b.company.id));
    expect(company).toBeNull();
    const members = await withActor(p.app, a.user.id, (db) => listMemberships(db, b.company.id));
    expect(members).toEqual([]);
  });

  it("denies reading or cancelling another company's job", async () => {
    const job = await withActor(p.app, b.user.id, (db) =>
      enqueueJob(db, { companyId: b.company.id, kind: "noop", idempotencyKey: "k1", payload: {}, requestedBy: b.user.id, maxAttempts: 3 }),
    );
    expect(await withActor(p.app, a.user.id, (db) => getJob(db, job.id))).toBeNull();
    expect(await withActor(p.app, a.user.id, (db) => cancelJob(db, job.id))).toBeNull();
    expect(await withActor(p.app, a.user.id, (db) => listJobs(db, b.company.id))).toEqual([]);
    // Still visible and unchanged for the owner.
    expect((await withActor(p.app, b.user.id, (db) => getJob(db, job.id)))?.status).toBe("queued");
  });

  it("refuses enqueueing into another company even with a forged company_id", async () => {
    await expect(
      withActor(p.app, a.user.id, (db) =>
        enqueueJob(db, { companyId: b.company.id, kind: "noop", idempotencyKey: "forged", payload: {}, requestedBy: a.user.id, maxAttempts: 3 }),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("refuses enqueueing on behalf of another user", async () => {
    await expect(
      withActor(p.app, a.user.id, (db) =>
        enqueueJob(db, { companyId: a.company.id, kind: "noop", idempotencyKey: "impersonate", payload: {}, requestedBy: b.user.id, maxAttempts: 3 }),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("denies everything without an actor", async () => {
    expect(await withActor(p.app, null, (db) => listCompanies(db))).toEqual([]);
    await expect(
      withActor(p.app, null, (db) => db.query("select app.create_company_with_owner('x', 'idea')")),
    ).rejects.toThrow(/no actor/);
  });

  it("app role cannot bypass RLS or insert companies directly", async () => {
    await expect(
      withActor(p.app, a.user.id, (db) =>
        db.query("insert into companies (name, lifecycle_stage, created_by) values ('direct', 'idea', $1)", [a.user.id]),
      ),
    ).rejects.toThrow(/row-level security/);
    const { rows } = await p.app.query<{ rolbypassrls: boolean }>("select rolbypassrls from pg_roles where rolname = current_user");
    expect(rows[0]?.rolbypassrls).toBe(false);
  });

  it("revoked members lose access immediately", async () => {
    const c = await makeTenant(p.app, "gamma");
    await p.admin.query("insert into memberships (company_id, user_id, role, accepted_at) values ($1, $2, 'member', now())", [c.company.id, a.user.id]);
    expect(await withActor(p.app, a.user.id, (db) => getCompany(db, c.company.id))).not.toBeNull();
    await p.admin.query("update memberships set revoked_at = now() where company_id = $1 and user_id = $2", [c.company.id, a.user.id]);
    expect(await withActor(p.app, a.user.id, (db) => getCompany(db, c.company.id))).toBeNull();
  });
});
