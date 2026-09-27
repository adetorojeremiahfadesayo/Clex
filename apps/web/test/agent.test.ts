import { describe, expect, it, vi } from "vitest";
import { parseServerEnv } from "@lex/domain";
import type { Matter, MatterDocument } from "@lex/db";
import { runAgent } from "../src/lib/agent";
import { moduleById } from "../src/lib/modules";
import { renderRegistrationPack } from "../src/lib/registration-pack";

const contracts = moduleById("contracts")!;
const matter: Matter = { id: "m1", companyId: "c1", kind: "supplier", title: "Contracts & suppliers", summary: "", context: { topic: "contracts" }, profileRevisionId: null, status: "open", createdAt: "2026-09-26T00:00:00.000Z" };
const doc = (filename: string, text: string): MatterDocument => ({ id: filename, companyId: "c1", matterId: "m1", filename, mimeType: "text/plain", byteSize: text.length, sha256: "x", extractedText: text, extractionStatus: "readable", createdAt: "2026-09-26T00:00:00.000Z" });
const config = parseServerEnv({ NODE_ENV: "test", DATABASE_URL: "postgres://admin@test/db", APP_DATABASE_URL: "postgres://app@test/db", LLM_PROVIDER: "none" });
const base = { matter, facts: {}, companyName: "Clex Demo Bakery", config };

describe("local agent", () => {
  it("flags where the conversation and the document disagree, quoting only supplied text", async () => {
    const docs = [doc("conversation-slack-1.txt", contracts.sample.conversation.text), doc("flour.txt", contracts.sample.document!.text)];
    const result = await runAgent({ ...base, docs, message: "Does this match what we agreed?" });
    expect(result.mode).toBe("preparation");
    const titles = result.findings.map((f) => f.title);
    expect(titles).toContain("Conversation and document disagree: payment terms");
    expect(titles).toContain("Conversation and document disagree: governing law");
    for (const f of result.findings) if (f.documentExcerpt) expect(docs.some((d) => d.extractedText.includes(f.documentExcerpt!))).toBe(true);
    expect(result.letter).toBeNull();
  });

  it("drafts an editable letter to the named counterparty only when asked", async () => {
    const docs = [doc("conversation-slack-1.txt", contracts.sample.conversation.text), doc("flour.txt", contracts.sample.document!.text)];
    const result = await runAgent({ ...base, docs, message: "Draft a letter asking for changes" });
    expect(result.letter).toMatch(/^WORKING DRAFT — NOT REVIEWED BY A LAWYER/);
    expect(result.letter).toContain("Dear Demo Flour Co,");
    expect(result.letter).toContain("within 7 days of invoice");
  });

  it("does not invent findings without sources", async () => {
    const result = await runAgent({ ...base, docs: [], message: "Draft a letter" });
    expect(result.findings).toHaveLength(0);
    expect(result.letter).toBeNull();
    expect(result.sourceCount).toBe(0);
  });

  it("keeps the instant review available when a model is configured but not selected", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const liveConfig = parseServerEnv({ NODE_ENV: "test", DATABASE_URL: "postgres://admin@test/db", APP_DATABASE_URL: "postgres://app@test/db", LLM_PROVIDER: "openai", LLM_MODEL: "test-model", LLM_API_KEY: "test-key" });
    const docs = [doc("conversation-slack-1.txt", contracts.sample.conversation.text), doc("flour.txt", contracts.sample.document!.text)];
    const result = await runAgent({ ...base, config: liveConfig, docs, message: "Does this match what we agreed?", allowExternalProcessing: false });
    expect(result.mode).toBe("preparation");
    expect(result.findings.map((finding) => finding.title)).toContain("Conversation and document disagree: payment terms");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requests strict structured output for live OpenAI reviews", async () => {
    const text = "Payment is due monthly in GBP.";
    let requestBody: BodyInit | null | undefined;
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      requestBody = init?.body;
      return { ok: true, json: async () => ({ output: [{ content: [{ type: "output_text", text: JSON.stringify({ reply: "The payment clause needs confirmation.", findings: [{ kind: "suggestion", title: "Confirm payment timing", explanation: "Check that monthly billing matches the deal.", companyReason: "The agreement sets a monthly payment schedule.", documentExcerpt: text, comparison: null, sourceType: "document" }], questions: [], letter: null }) }] }] }) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    const liveConfig = parseServerEnv({ NODE_ENV: "test", DATABASE_URL: "postgres://admin@test/db", APP_DATABASE_URL: "postgres://app@test/db", LLM_PROVIDER: "openai", LLM_MODEL: "test-model", LLM_API_KEY: "test-key" });
    const result = await runAgent({ ...base, config: liveConfig, docs: [doc("supplier.txt", text)], message: "Review the payment terms", allowExternalProcessing: true });
    const body = JSON.parse(String(requestBody)) as { text: { format: { type: string; name: string; strict: boolean; schema: unknown } } };

    expect(result.mode).toBe("live");
    expect(body.text.format).toMatchObject({ type: "json_schema", name: "clex_agent_response", strict: true });
    expect(body.text.format.schema).toMatchObject({ properties: { findings: { items: { properties: { kind: { enum: ["observation", "question", "suggestion"] } }, required: expect.arrayContaining(["comparison"]) } } } });
  });
});

describe("registration pack", () => {
  it("renders a PDF", async () => {
    const bytes = await renderRegistrationPack(
      { id: "c1", name: "Clex Demo Bakery ₦", lifecycleStage: "pre_registration", createdBy: "u", createdAt: "", updatedAt: "" } as never,
      { revision: { id: "r", version: 1, facts: {} }, assessment: null, items: [], stale: false, pack: null, packStale: false } as never,
      { contentNotice: "Synthetic.", contentVersion: null, stale: false, progress: { done: 0, applicable: 0, unknown: 0 }, entries: [], superseded: [] },
      "2026-09-26T00:00:00.000Z",
    );
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
  });
});
