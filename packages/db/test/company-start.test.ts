import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyAnswers } from "@lex/domain";
import { assessProfile } from "@lex/content";
import { withActor } from "../src/tenant";
import { confirmRevision, getCurrentRevision, listRevisions } from "../src/repositories/profile";
import { VersionConflictError, applyChecklistTransition, getChecklistItem, insertAssessment, listChecklist, syncChecklist } from "../src/repositories/assessments";
import { hasDb, makeTenant, pools } from "./helpers";

describe.skipIf(!hasDb)("M1 profile revisions, assessments and checklist", () => {
  const p = pools();
  let a: Awaited<ReturnType<typeof makeTenant>>;
  let b: Awaited<ReturnType<typeof makeTenant>>;

  beforeAll(async () => {
    a = await makeTenant(p.app, "rev-a");
    b = await makeTenant(p.app, "rev-b");
  });
  afterAll(async () => {
    await Promise.all([p.admin.end(), p.app.end(), p.worker.end()]);
  });

  const actor = (userId: string) => ({ userId, provenance: "user_confirmed" as const, at: new Date().toISOString() });

  async function generate(userId: string, companyId: string) {
    return withActor(p.app, userId, async (db) => {
      const revision = (await getCurrentRevision(db, companyId))!;
      const result = assessProfile(revision.facts);
      const assessment = await insertAssessment(db, { companyId, profileRevisionId: revision.id, result });
      const items = await syncChecklist(db, {
        companyId,
        assessment,
        applicableRuleIds: result.decisions.filter((d) => d.applicability !== "no").map((d) => ({ id: d.ruleId, version: d.ruleVersion })),
      });
      return { revision, assessment, items };
    });
  }

  it("A10: revisions are versioned, chained and immutable snapshots", async () => {
    const f1 = applyAnswers({}, { registration_status: { state: "answered", value: "not_registered" } }, actor(a.user.id));
    const r1 = await withActor(p.app, a.user.id, (db) => confirmRevision(db, { companyId: a.company.id, facts: f1, reason: "first" }));
    const f2 = applyAnswers(f1, { legal_form: { state: "unknown" } }, actor(a.user.id));
    const r2 = await withActor(p.app, a.user.id, (db) => confirmRevision(db, { companyId: a.company.id, facts: f2, reason: "second" }));
    expect(r1.version).toBe(1);
    expect(r2.version).toBe(2);
    expect(r2.previousRevisionId).toBe(r1.id);
    const history = await withActor(p.app, a.user.id, (db) => listRevisions(db, a.company.id));
    expect(history.map((r) => r.version)).toEqual([2, 1]);
    expect(history[1]!.facts.legal_form).toBeUndefined();
    expect(history[0]!.facts.legal_form?.value.state).toBe("unknown");
    expect(history[0]!.facts.registration_status?.provenance).toBe("user_confirmed");
    const { rows } = await p.admin.query("select current_profile_revision_id from companies where id = $1", [a.company.id]);
    expect(rows[0].current_profile_revision_id).toBe(r2.id);
  });

  it("A14: another tenant cannot read or confirm revisions", async () => {
    expect(await withActor(p.app, b.user.id, (db) => listRevisions(db, a.company.id))).toEqual([]);
    await expect(
      withActor(p.app, b.user.id, (db) => confirmRevision(db, { companyId: a.company.id, facts: {}, reason: "forged" })),
    ).rejects.toThrow(/not authorised/);
    await expect(withActor(p.app, null, (db) => confirmRevision(db, { companyId: a.company.id, facts: {}, reason: "anon" }))).rejects.toThrow(/not authorised/);
  });

  it("stored facts are validated on read", async () => {
    await p.admin.query("insert into profile_revisions (company_id, version, facts, confirmed_by, reason) values ($1, 99, '{\"bogus\": 1}', $2, 'corrupt')", [b.company.id, b.user.id]);
    await expect(withActor(p.app, b.user.id, (db) => getCurrentRevision(db, b.company.id))).rejects.toThrow();
    await p.admin.query("delete from profile_revisions where company_id = $1 and version = 99", [b.company.id]);
  });

  it("A02 + stale detection: assessment binds to a revision and checklist follows applicability", async () => {
    const g1 = await generate(a.user.id, a.company.id);
    expect(g1.assessment.result.mode).toBe("synthetic_demo");
    expect(g1.items.map((i) => i.ruleId)).toContain("prepare-registration");
    expect(g1.items.every((i) => i.status === "suggested" && i.assessmentId === g1.assessment.id)).toBe(true);

    // Business becomes registered → prepare-registration no longer applies.
    const facts = applyAnswers(g1.revision.facts, {
      registration_status: { state: "answered", value: "registered" },
      registration_number: { state: "answered", value: "X1" },
      registration_evidence: { state: "answered", value: "cert" },
    }, actor(a.user.id));
    const r3 = await withActor(p.app, a.user.id, (db) => confirmRevision(db, { companyId: a.company.id, facts, reason: "registered" }));
    expect(r3.id).not.toBe(g1.assessment.profileRevisionId); // stale until regenerated
    const g2 = await generate(a.user.id, a.company.id);
    const prep = g2.items.find((i) => i.ruleId === "prepare-registration");
    expect(prep?.status).toBe("superseded");
    // Never applicable for this tenant (status was answered from the start), so no item was ever created.
    expect(g2.items.find((i) => i.ruleId === "confirm-registration-status")).toBeUndefined();
    expect(g2.assessment.profileRevisionId).toBe(r3.id);
  });

  it("transitions require the expected version and terminal states are enforced by the database", async () => {
    const items = await withActor(p.app, a.user.id, (db) => listChecklist(db, a.company.id));
    const item = items.find((i) => i.status === "suggested")!;
    const accepted = await withActor(p.app, a.user.id, (db) => applyChecklistTransition(db, { itemId: item.id, expectedVersion: item.version, to: "accepted", actorId: a.user.id }));
    expect(accepted.version).toBe(item.version + 1);
    await expect(
      withActor(p.app, a.user.id, (db) => applyChecklistTransition(db, { itemId: item.id, expectedVersion: item.version, to: "in_progress", actorId: a.user.id })),
    ).rejects.toBeInstanceOf(VersionConflictError);
    const inProgress = await withActor(p.app, a.user.id, (db) => applyChecklistTransition(db, { itemId: item.id, expectedVersion: accepted.version, to: "in_progress", actorId: a.user.id }));
    const done = await withActor(p.app, a.user.id, (db) => applyChecklistTransition(db, { itemId: item.id, expectedVersion: inProgress.version, to: "user_completed", evidence: "Certificate 123", actorId: a.user.id }));
    expect(done).toMatchObject({ status: "user_completed", evidence: "Certificate 123", completedBy: a.user.id });
    expect(done.completedAt).not.toBeNull();
    // Terminal reviewer_verified cannot change even for a superuser.
    await p.admin.query("update checklist_items set status = 'reviewer_verified', version = version + 1 where id = $1", [item.id]);
    await expect(p.admin.query("update checklist_items set status = 'in_progress', version = version + 1 where id = $1", [item.id])).rejects.toThrow(/terminal/);
    // Version must increment by exactly one.
    await expect(p.admin.query("update checklist_items set evidence = 'x', version = version + 5 where id = $1", [item.id])).rejects.toThrow(/version conflict/);
  });

  it("A14: another tenant cannot see or transition checklist items", async () => {
    const items = await withActor(p.app, a.user.id, (db) => listChecklist(db, a.company.id));
    const target = items.find((i) => i.status !== "reviewer_verified" && i.status !== "superseded")!;
    expect(await withActor(p.app, b.user.id, (db) => getChecklistItem(db, target.id))).toBeNull();
    await expect(
      withActor(p.app, b.user.id, (db) => applyChecklistTransition(db, { itemId: target.id, expectedVersion: target.version, to: "accepted", actorId: b.user.id })),
    ).rejects.toBeInstanceOf(VersionConflictError);
    expect((await withActor(p.app, a.user.id, (db) => getChecklistItem(db, target.id)))?.version).toBe(target.version);
  });

  it("a completed item survives regeneration and is never silently reopened", async () => {
    const items = await withActor(p.app, a.user.id, (db) => listChecklist(db, a.company.id));
    const verified = items.find((i) => i.status === "reviewer_verified")!;
    const g = await generate(a.user.id, a.company.id);
    expect(g.items.find((i) => i.id === verified.id)?.status).toBe("reviewer_verified");
  });
});
