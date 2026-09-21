import { describe, expect, it } from "vitest";
import { applyAnswers, checkChecklistTransition, intakeViews, openQuestions, type FactMap } from "../src/index";

const actor = { userId: "00000000-0000-0000-0000-000000000001", provenance: "user_confirmed" as const, at: "2026-09-21T00:00:00.000Z" };

describe("adaptive intake", () => {
  it("only asks registration details once the business is registered", () => {
    const empty = intakeViews({}).map((v) => v.question.key);
    expect(empty).not.toContain("registration_number");
    const registered = applyAnswers({}, { registration_status: { state: "answered", value: "registered" } }, actor);
    expect(intakeViews(registered).map((v) => v.question.key)).toContain("registration_number");
  });

  it("asks a market-specific subdivision prompt", () => {
    const facts = applyAnswers({}, { formation_country: { state: "answered", value: "GB" } }, actor);
    const sub = intakeViews(facts).find((v) => v.question.key === "formation_subdivision");
    expect(sub?.prompt).toMatch(/England and Wales, Scotland, or Northern Ireland/);
    expect(intakeViews({}).find((v) => v.question.key === "formation_subdivision")).toBeUndefined();
  });

  it("A03: Not sure stays unknown and is no longer an open question", () => {
    const facts = applyAnswers({}, { legal_form: { state: "unknown" } }, actor);
    expect(facts.legal_form?.value.state).toBe("unknown");
    expect(facts.legal_form?.provenance).toBe("user_confirmed");
    expect(openQuestions(facts).map((v) => v.question.key)).not.toContain("legal_form");
  });

  it("records provenance and actor on every answer and preserves untouched facts", () => {
    const first = applyAnswers({}, { industry: { state: "answered", value: "Food" } }, actor);
    const second = applyAnswers(first, { activities: { state: "answered", value: "Meals" } }, { ...actor, at: "2026-09-22T00:00:00.000Z" });
    expect(second.industry).toEqual(first.industry);
    expect(second.activities).toMatchObject({ recordedAt: "2026-09-22T00:00:00.000Z", recordedBy: actor.userId, provenance: "user_confirmed" });
  });
});

describe("checklist transitions", () => {
  it("requires evidence to complete and a reason to dismiss", () => {
    expect(checkChecklistTransition("in_progress", "user_completed", "owner", {}).ok).toBe(false);
    expect(checkChecklistTransition("in_progress", "user_completed", "owner", { evidence: "Certificate #1" }).ok).toBe(true);
    expect(checkChecklistTransition("suggested", "dismissed_with_reason", "owner", {}).ok).toBe(false);
    expect(checkChecklistTransition("suggested", "dismissed_with_reason", "owner", { reason: "n/a" }).ok).toBe(true);
  });
  it("A13 groundwork: only reviewers verify; founders cannot", () => {
    expect(checkChecklistTransition("user_completed", "reviewer_verified", "owner", {}).ok).toBe(false);
    expect(checkChecklistTransition("user_completed", "reviewer_verified", "reviewer", {}).ok).toBe(true);
    expect(checkChecklistTransition("suggested", "accepted", "reviewer", {}).ok).toBe(false);
  });
  it("rejects skipping states", () => {
    expect(checkChecklistTransition("suggested", "user_completed", "owner", { evidence: "x" }).ok).toBe(false);
    expect(checkChecklistTransition("reviewer_verified", "in_progress", "owner", {}).ok).toBe(false);
  });
});
