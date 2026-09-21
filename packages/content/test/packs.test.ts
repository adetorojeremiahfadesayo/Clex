import { describe, expect, it } from "vitest";
import { applyAnswers, evaluateContentRule, packVersionContentSchema } from "@lex/domain";
import { assessProfile, draftPackManifests, evaluatePack } from "../src/index";

describe("draft pack manifests", () => {
  it("exist for all five markets, validate, and are never marked published or reviewed", () => {
    expect(draftPackManifests.map((m) => m.market).sort()).toEqual(["CN", "EU", "GB", "NG", "US"]);
    for (const m of draftPackManifests) {
      expect(() => packVersionContentSchema.parse(m.content)).not.toThrow();
      expect(m.content.notes).toMatch(/draft/i);
      expect(m.content.excludedTopics.length).toBeGreaterThan(0);
      expect(JSON.stringify(m.content)).not.toMatch(/must register within|deadline|is required by law/i);
    }
  });

  it("every manifest passes its own cases with full rule coverage", () => {
    for (const m of draftPackManifests) {
      const r = evaluatePack(m.content, m.cases);
      expect(r.failures, m.slug).toEqual([]);
      expect(r.uncoveredRuleIds, m.slug).toEqual([]);
      expect(r.total).toBeGreaterThanOrEqual(4);
    }
  });

  it("evaluator flags wrong outcomes and unacceptable claims", () => {
    const m = draftPackManifests[0]!;
    const wrong = { ...m.cases[0]!, expected: { "confirm-registration-status": "no" as const } };
    expect(evaluatePack(m.content, [wrong]).failures[0]).toMatchObject({ expected: "no", actual: "yes" });
    const claim = { ...m.cases[0]!, unacceptableClaims: ["official directory"] };
    expect(evaluatePack(m.content, [claim]).failures.some((f) => f.actual === "present")).toBe(true);
  });

  it("rule DSL: unanswered predicate yields unknown, false predicate yields no, unresolved follow-ups surface", () => {
    const rule = draftPackManifests[0]!.content.rules.find((r) => r.id === "locate-official-registration-route")!;
    const actor = { userId: "00000000-0000-0000-0000-000000000001", provenance: "user_confirmed" as const, at: "2026-09-21T00:00:00.000Z" };
    expect(evaluateContentRule(rule, {}).applicability).toBe("unknown");
    expect(evaluateContentRule(rule, applyAnswers({}, { registration_status: { state: "answered", value: "registered" }, formation_country: { state: "answered", value: "NG" } }, actor)).applicability).toBe("no");
    const yes = evaluateContentRule(rule, applyAnswers({}, { registration_status: { state: "answered", value: "not_registered" }, formation_country: { state: "answered", value: "NG" } }, actor));
    expect(yes.applicability).toBe("yes");
    expect(yes.missingFactKeys).toEqual(["formation_subdivision", "legal_form"]);
    expect(yes.reason).toMatch(/not_registered/);
  });

  it("assessment ignores a pack whose subdivision scope does not match", () => {
    const m = draftPackManifests.find((x) => x.market === "GB")!;
    const actor = { userId: "00000000-0000-0000-0000-000000000001", provenance: "user_confirmed" as const, at: "2026-09-21T00:00:00.000Z" };
    const facts = applyAnswers({}, { formation_country: { state: "answered", value: "GB" }, formation_subdivision: { state: "answered", value: "Scotland" } }, actor);
    const version = { id: "11111111-1111-1111-1111-111111111111", packId: "22222222-2222-2222-2222-222222222222", version: 1, status: "published" as const, content: { ...m.content, subdivisions: ["England and Wales"] }, contentHash: "h", authorId: actor.userId, reviewerId: actor.userId, reviewedAt: "2026-09-21T00:00:00.000Z", publishedAt: "2026-09-21T00:00:00.000Z", statusReason: null, createdAt: "", updatedAt: "" };
    const r = assessProfile(facts, { packId: version.packId, slug: m.slug, version });
    expect(r.mode).toBe("synthetic_demo");
    expect(r.coverage.notice).toMatch(/not for subdivision "Scotland"/);
  });
});
