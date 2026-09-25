import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyAnswers } from "@lex/domain";
import { assessProfile, draftPackManifests, evaluatePack } from "@lex/content";
import { withActor } from "../src/tenant";
import { createUser } from "../src/repositories/users";
import {
  addSourceVersion, createDraftVersion, findPublishedPack, getPackVersion, listPacks, recordEvaluation,
  transitionPackVersion, updateDraftContent, upsertPack, upsertSource,
} from "../src/repositories/content";
import { hasDb, makeTenant, pools } from "./helpers";

describe.skipIf(!hasDb)("M2 content system: registry, publication gate, scope resolution", () => {
  const p = pools();
  const manifest = draftPackManifests.find((m) => m.market === "NG")!;
  let editor: { id: string };
  let reviewer: { id: string };
  let founder: Awaited<ReturnType<typeof makeTenant>>;
  let packId: string;
  let versionId: string;
  let contentHash: string;

  async function platformUser(label: string, role: string) {
    const u = await withActor(p.app, null, (db) => createUser(db, { email: `${label}-${Date.now()}@example.test`, displayName: label, password: "correct-horse-battery" }));
    await p.admin.query("update users set platform_role = $2 where id = $1", [u.id, role]);
    return u;
  }

  beforeAll(async () => {
    editor = await platformUser("editor", "content_editor");
    reviewer = await platformUser("reviewer", "content_reviewer");
    founder = await makeTenant(p.app, "founder");
  });
  afterAll(async () => {
    await Promise.all([p.admin.end(), p.app.end(), p.worker.end()]);
  });

  it("founders cannot write sources or packs; editors can", async () => {
    await expect(withActor(p.app, founder.user.id, (db) => upsertSource(db, manifest.sources[0]!.source, founder.user.id))).rejects.toThrow(/row-level security/);
    await withActor(p.app, editor.id, async (db) => {
      for (const s of manifest.sources) {
        const row = await upsertSource(db, s.source, editor.id);
        await addSourceVersion(db, row.id, s.version, editor.id);
      }
      const pack = await upsertPack(db, { slug: `test-${manifest.slug}`, market: "NG", title: "Test" }, editor.id);
      packId = pack.id;
      const v = await createDraftVersion(db, packId, manifest.content, editor.id);
      versionId = v.id;
      contentHash = v.contentHash;
      expect(v.status).toBe("draft");
    });
  });

  it("schema rejects rules citing unknown sources or undeclared template slots", async () => {
    const bad = { ...manifest.content, rules: [{ ...manifest.content.rules[0]!, sourceSlugs: ["nope"] }] };
    await expect(withActor(p.app, editor.id, (db) => updateDraftContent(db, versionId, bad))).rejects.toThrow(/not in sourceRefs/);
  });

  it("drafts are hidden from founders until published (RLS)", async () => {
    const seen = await withActor(p.app, founder.user.id, (db) => listPacks(db));
    expect(seen.find((x) => x.id === packId)?.versions ?? []).toEqual([]);
    expect(await withActor(p.app, founder.user.id, (db) => getPackVersion(db, versionId))).toBeNull();
  });

  it("A06/A24 gate: publication needs reviewer role, a different person and a passing evaluation on the exact hash", async () => {
    await withActor(p.app, editor.id, (db) => transitionPackVersion(db, { versionId, to: "under_review" }));
    // Author tries to publish themself.
    await expect(withActor(p.app, editor.id, (db) => transitionPackVersion(db, { versionId, to: "published", reviewerId: editor.id }))).rejects.toThrow(/author cannot publish/);
    // Reviewer without evaluation.
    await expect(withActor(p.app, reviewer.id, (db) => transitionPackVersion(db, { versionId, to: "published", reviewerId: reviewer.id }))).rejects.toThrow(/passing evaluation/);
    // Failing evaluation does not count.
    await withActor(p.app, reviewer.id, (db) => recordEvaluation(db, { packVersionId: versionId, contentHash, total: 4, passed: 3, failures: [{}], runBy: reviewer.id }));
    await expect(withActor(p.app, reviewer.id, (db) => transitionPackVersion(db, { versionId, to: "published", reviewerId: reviewer.id }))).rejects.toThrow(/passing evaluation/);
    // Evaluation for a different hash does not count.
    await withActor(p.app, reviewer.id, (db) => recordEvaluation(db, { packVersionId: versionId, contentHash: "deadbeef", total: 4, passed: 4, failures: [], runBy: reviewer.id }));
    await expect(withActor(p.app, reviewer.id, (db) => transitionPackVersion(db, { versionId, to: "published", reviewerId: reviewer.id }))).rejects.toThrow(/passing evaluation/);
    // Content is frozen once under review.
    await expect(p.admin.query("update pack_versions set content_hash = 'x' where id = $1", [versionId])).rejects.toThrow(/frozen/);
    // Real evaluation passes → publish.
    const report = evaluatePack(manifest.content, manifest.cases);
    expect(report.failures).toEqual([]);
    await withActor(p.app, reviewer.id, (db) => recordEvaluation(db, { packVersionId: versionId, contentHash, total: report.total, passed: report.passed, failures: [], runBy: reviewer.id }));
    const published = await withActor(p.app, reviewer.id, (db) => transitionPackVersion(db, { versionId, to: "published", reviewerId: reviewer.id }));
    expect(published.status).toBe("published");
    expect(published.publishedAt).not.toBeNull();
    // Founders now see it.
    expect((await withActor(p.app, founder.user.id, (db) => getPackVersion(db, versionId)))?.status).toBe("published");
  });

  it("a founder with a non-reviewer platform role cannot be recorded as the publisher", async () => {
    const v2 = await withActor(p.app, editor.id, (db) => createDraftVersion(db, packId, manifest.content, editor.id));
    await withActor(p.app, editor.id, (db) => transitionPackVersion(db, { versionId: v2.id, to: "under_review" }));
    await p.admin.query("insert into pack_evaluations (pack_version_id, content_hash, total, passed, failures, run_by) values ($1, $2, 1, 1, '[]', $3)", [v2.id, v2.contentHash, reviewer.id]);
    await expect(p.admin.query("update pack_versions set status = 'published', reviewer_id = $2 where id = $1", [v2.id, founder.user.id])).rejects.toThrow(/lacks content_reviewer role/);
    await withActor(p.app, reviewer.id, (db) => transitionPackVersion(db, { versionId: v2.id, to: "draft", reviewerId: reviewer.id, reason: "test" }));
  });

  it("assessment uses the published pack in scope, and falls back once it is withdrawn (A24)", async () => {
    const facts = applyAnswers({}, { registration_status: { state: "answered", value: "not_registered" }, formation_country: { state: "answered", value: "NG" } }, { userId: founder.user.id, provenance: "user_confirmed", at: new Date().toISOString() });
    const found = await withActor(p.app, founder.user.id, (db) => findPublishedPack(db, "NG", "formation"));
    expect(found?.pack.id).toBe(packId);
    const reviewed = assessProfile(facts, { packId, slug: found!.pack.slug, version: found!.version });
    expect(reviewed.mode).toBe("reviewed_pack");
    expect(reviewed.coverage).toMatchObject({ packStatus: "published", packVersionId: versionId });
    expect(reviewed.decisions.find((d) => d.ruleId === "locate-official-registration-route")?.applicability).toBe("yes");
    // Employment is not in this pack's matter types.
    expect(await withActor(p.app, founder.user.id, (db) => findPublishedPack(db, "NG", "employment"))).toBeNull();
    // Withdraw → no longer resolves; synthetic fallback labelled accordingly.
    await withActor(p.app, reviewer.id, (db) => transitionPackVersion(db, { versionId, to: "withdrawn", reviewerId: reviewer.id, reason: "test withdrawal" }));
    expect(await withActor(p.app, founder.user.id, (db) => findPublishedPack(db, "NG", "formation"))).toBeNull();
    const fallback = assessProfile(facts, null);
    expect(fallback.mode).toBe("synthetic_demo");
    // Withdrawn is terminal.
    await expect(withActor(p.app, reviewer.id, (db) => transitionPackVersion(db, { versionId, to: "published", reviewerId: reviewer.id }))).rejects.toThrow(/withdrawn/);
  });
});
