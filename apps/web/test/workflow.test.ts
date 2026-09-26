import { describe, expect, it } from "vitest";
import { applyAnswers } from "@lex/domain";
import type { Matter, MatterAnalysis, MatterDocument, MatterDraft } from "@lex/db";
import { complianceCalendar, complianceScore, moduleViews } from "../src/lib/compliance";
import { parseFounders, registrationTasks, serializeFounders } from "../src/lib/registration";

const actor = { userId: "u1", provenance: "user_confirmed" as const, at: "2026-01-15T00:00:00.000Z" };
const a = (value: string) => ({ state: "answered" as const, value });

describe("registration tasks", () => {
  it("complete themselves from saved facts, never by manual ticking", () => {
    const base = applyAnswers({}, { legal_form: a("private_company") }, actor);
    const t0 = registrationTasks(base, { packDownloaded: false, certificateUploaded: false });
    expect(t0.filter((t) => t.done).map((t) => t.id)).toEqual(["profile", "legal_form"]);
    expect(t0.find((t) => t.id === "pack")!.locked).toBe(true);
    const full = applyAnswers(base, { proposed_names: a("A Ltd; B Ltd"), founder_details: a(serializeFounders([{ name: "Ada", role: "Director", share: "100" }])), registered_address: a("1 Street") }, actor);
    const t1 = registrationTasks(full, { packDownloaded: true, certificateUploaded: false });
    expect(t1.find((t) => t.id === "pack")!.done).toBe(true);
    expect(t1.find((t) => t.id === "certificate")!.done).toBe(false);
    const reg = applyAnswers(full, { registration_status: a("registered") }, actor);
    expect(registrationTasks(reg, { packDownloaded: true, certificateUploaded: true }).every((t) => t.done)).toBe(true);
  });

  it("round-trips founder rows", () => {
    expect(parseFounders(serializeFounders([{ name: "Ada Okafor", role: "Director", share: "60" }]))).toEqual([{ name: "Ada Okafor", role: "Director", share: "60" }]);
  });
});

describe("compliance status", () => {
  const matter: Matter = { id: "m", companyId: "c", kind: "supplier", title: "Contracts", summary: "", context: { topic: "contracts" }, profileRevisionId: null, status: "open", createdAt: "2026-01-01T00:00:00.000Z" };
  const doc = (filename: string): MatterDocument => ({ id: filename, companyId: "c", matterId: "m", filename, mimeType: "text/plain", byteSize: 1, sha256: "x", extractedText: "x", extractionStatus: "readable", createdAt: "2026-01-01T00:00:00.000Z" });
  const analysis = (at: string): MatterAnalysis => ({ id: "a", documentId: null, profileRevisionId: null, mode: "preparation", status: "needs_review", findings: [{ kind: "suggestion", title: "Clash", explanation: "e", companyReason: "r", documentExcerpt: "x", sourceType: "document" }], questions: [], errorMessage: null, provider: null, model: null, createdAt: at });
  const draft = (at: string): MatterDraft => ({ id: "d", version: 1, body: "b", status: "unreviewed", createdAt: at });

  it("moves from not started to needs attention to in order", () => {
    expect(moduleViews([], []).every((v) => v.status === "not_started")).toBe(true);
    const docs = [doc("conversation-slack-1.txt"), doc("contract.txt")];
    const attention = moduleViews([{ matter, documents: docs, analyses: [analysis("2026-01-02T00:00:00Z")], drafts: [] }], [])[0]!;
    expect(attention.status).toBe("needs_attention");
    const resolved = moduleViews([{ matter, documents: docs, analyses: [analysis("2026-01-02T00:00:00Z")], drafts: [draft("2026-01-03T00:00:00Z")] }], []);
    expect(resolved[0]!.status).toBe("in_order");
    expect(complianceScore(resolved)).toBe(Math.round((4 / 28) * 100));
  });

  it("labels calendar dates as placeholders relative to registration", () => {
    const facts = applyAnswers({}, { registration_status: a("registered"), regulated_activity: a("no") }, actor);
    const cal = complianceCalendar(facts, []);
    expect(cal.every((e) => e.placeholder)).toBe(true);
    expect(cal[0]!.date).toBe("2026-04-15");
    expect(cal.some((e) => e.moduleId === "licences")).toBe(false);
  });
});
