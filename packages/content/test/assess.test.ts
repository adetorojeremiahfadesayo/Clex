import { describe, expect, it } from "vitest";
import { applyAnswers, type FactMap } from "@lex/domain";
import { assessProfile, officialSources, sourcesForMarket, syntheticRules } from "../src/index";

const actor = { userId: "00000000-0000-0000-0000-000000000001", provenance: "user_confirmed" as const, at: "2026-09-21T00:00:00.000Z" };
const facts = (answers: Parameters<typeof applyAnswers>[1]): FactMap => applyAnswers({}, answers, actor);

describe("synthetic assessment", () => {
  it("is always labelled synthetic_demo and versioned", () => {
    const r = assessProfile({});
    expect(r.mode).toBe("synthetic_demo");
    expect(r.contentVersion).toMatch(/^synthetic-/);
    expect(syntheticRules.every((rule) => rule.status === "synthetic")).toBe(true);
  });

  it("A01: unregistered startup gets a registration preparation path with official links", () => {
    const r = assessProfile(facts({ registration_status: { state: "answered", value: "not_registered" }, formation_country: { state: "answered", value: "NG" } }));
    const prep = r.decisions.find((d) => d.ruleId === "prepare-registration");
    expect(prep?.applicability).toBe("yes");
    expect(prep?.reason).toMatch(/not registered/);
    expect(prep?.factKeysUsed).toEqual(["registration_status", "formation_country"]);
    expect(r.coverage).toMatchObject({ market: "NG", packStatus: "research_pointers", packId: null });
    expect(r.coverage.capabilities).not.toContain("reviewed_checklist");
    expect(sourcesForMarket("NG").map((s) => s.url)).toContain("https://cac.gov.ng/services/company-registration");
  });

  it("A02: registered business with evidence is not asked to register again", () => {
    const r = assessProfile(facts({
      registration_status: { state: "answered", value: "registered" },
      registration_number: { state: "answered", value: "SYN1" },
      registration_evidence: { state: "answered", value: "Certificate" },
      legal_form: { state: "answered", value: "private_company" },
    }));
    expect(r.decisions.find((d) => d.ruleId === "prepare-registration")?.applicability).toBe("no");
    expect(r.decisions.find((d) => d.ruleId === "confirm-registration-status")?.applicability).toBe("no");
    expect(r.decisions.find((d) => d.ruleId === "decide-legal-form")?.applicability).toBe("no");
  });

  it("A03: Not sure yields unknown applicability and a targeted question, never a classification", () => {
    const r = assessProfile(facts({ regulated_activity: { state: "unknown" }, legal_form: { state: "unknown" } }));
    const licence = r.decisions.find((d) => d.ruleId === "licence-question");
    expect(licence?.applicability).toBe("unknown");
    expect(licence?.missingFactKeys).toContain("regulated_activity");
    expect(r.unknownFactKeys).toEqual(expect.arrayContaining(["regulated_activity", "legal_form"]));
    const form = r.decisions.find((d) => d.ruleId === "decide-legal-form");
    expect(form?.applicability).toBe("yes");
    expect(form?.reason).toMatch(/not sure/i);
  });

  it("A04 groundwork: two different profiles produce different decisions referencing their own facts", () => {
    const a = assessProfile(facts({ employee_count: { state: "answered", value: 0 }, contractor_count: { state: "answered", value: 0 }, hiring_plan: { state: "answered", value: "no" } }));
    const b = assessProfile(facts({ employee_count: { state: "answered", value: 4 }, hiring_plan: { state: "answered", value: "yes" } }));
    expect(a.decisions.find((d) => d.ruleId === "hiring-preparation")?.applicability).toBe("no");
    const hb = b.decisions.find((d) => d.ruleId === "hiring-preparation");
    expect(hb?.applicability).toBe("yes");
    expect(hb?.reason).toMatch(/4 employees/);
    expect(hb?.missingFactKeys).toContain("worker_locations");
  });

  it("never emits a numeric score and never labels a source reviewed", () => {
    const r = assessProfile(facts({ formation_country: { state: "answered", value: "US" } }));
    expect(JSON.stringify(r)).not.toMatch(/score|compliant/i);
    expect(officialSources.every((s) => s.status === "research_pointer")).toBe(true);
    expect(r.coverage.notice).toMatch(/No reviewed legal content pack/);
  });
});
