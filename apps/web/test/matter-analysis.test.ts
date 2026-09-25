import { afterEach, describe, expect, it, vi } from "vitest";
import { applyAnswers, parseServerEnv } from "@lex/domain";
import type { Matter, MatterDocument } from "@lex/db";
import { analyseMatter, prepareMatter } from "../src/lib/matter-analysis";

const companyId = "11111111-1111-4111-8111-111111111111";
const matter: Matter = {
  id: "22222222-2222-4222-8222-222222222222",
  companyId,
  kind: "supplier",
  title: "Cloud hosting agreement",
  summary: "Hosting the customer portal",
  context: { deliverables: "Host the portal with daily backups", payment: "Monthly in GBP", dataAccess: "Customer contact data", governingLaw: "England and Wales" },
  profileRevisionId: null,
  status: "open",
  createdAt: "2026-09-25T00:00:00.000Z",
};
const facts = applyAnswers({}, {
  formation_country: { state: "answered", value: "GB" },
  industry: { state: "answered", value: "Software" },
  customer_data: { state: "answered", value: "yes" },
}, { userId: companyId, provenance: "user_confirmed", at: "2026-09-25T00:00:00.000Z" });
const extractedText = "Scope of work: host the portal and run backups. Payment is due monthly. Limitation of liability: fees paid in the last year. The supplier handles personal data and must use security measures. This agreement is governed by English law. Either party may terminate on 30 days notice.";
const document: MatterDocument = {
  id: "33333333-3333-4333-8333-333333333333",
  companyId,
  matterId: matter.id,
  filename: "supplier.txt",
  mimeType: "text/plain",
  byteSize: extractedText.length,
  sha256: "abc",
  extractedText,
  extractionStatus: "readable",
  createdAt: matter.createdAt,
};
const config = parseServerEnv({ NODE_ENV: "test", DATABASE_URL: "postgres://admin@test/db", APP_DATABASE_URL: "postgres://app@test/db", LLM_PROVIDER: "openai", LLM_MODEL: "test-model", LLM_API_KEY: "test-key" });

afterEach(() => vi.unstubAllGlobals());

describe("matter analysis", () => {
  it("uses company context and exact excerpts for supplier review preparation", () => {
    const result = prepareMatter(matter, facts, document);
    const titles = result.findings.map((finding) => finding.title);
    expect(titles).toContain("Match the promised work");
    expect(titles).toContain("Review risk allocation");
    expect(titles).toContain("Clarify data handling");
    expect(titles).toContain("Confirm governing law");
    expect(result.findings.some((finding) => finding.companyReason.includes("Host the portal with daily backups"))).toBe(true);
    for (const finding of result.findings.filter((item) => item.sourceType === "document")) {
      expect(finding.documentExcerpt).toBeTruthy();
      expect(extractedText).toContain(finding.documentExcerpt);
    }
  });

  it("asks for missing attachments instead of treating absent clauses as proven", () => {
    const result = prepareMatter(matter, facts, { ...document, extractedText: "A short cover letter." });
    expect(result.questions.some((question) => question.includes("scope or acceptance"))).toBe(true);
    expect(result.questions.some((question) => question.includes("payment wording"))).toBe(true);
    expect(result.questions.some((question) => question.includes("termination wording"))).toBe(true);
  });

  it("rejects a model finding with a fabricated document quotation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ findings: [{ kind: "observation", title: "Clause", explanation: "Review this wording.", companyReason: "The company uses a supplier.", sourceType: "document", documentExcerpt: "This clause does not exist." }], questions: [] }) }] }] }) }));
    await expect(analyseMatter(matter, facts, document, config)).rejects.toThrow("unsupported document quotation");
  });

  it("accepts a valid model response and marks it live only after validation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ findings: [{ kind: "question", title: "Check the cap", explanation: "Ask counsel to review the cap.", companyReason: "The company will host a customer portal.", sourceType: "document", documentExcerpt: "Limitation of liability: fees paid in the last year." }], questions: ["Is a higher cap needed?"] }) }] }] }) }));
    const result = await analyseMatter(matter, facts, document, config);
    expect(result.mode).toBe("live");
    expect(result.findings[0]?.documentExcerpt).toBe("Limitation of liability: fees paid in the last year.");
  });
});
