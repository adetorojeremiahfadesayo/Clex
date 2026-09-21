import { describe, expect, it } from "vitest";
import { liveModelConfigured, parseServerEnv } from "../src/env";
import { canTransitionJob } from "../src/jobs";

const base = { DATABASE_URL: "postgres://x", APP_DATABASE_URL: "postgres://y" };

describe("server env", () => {
  it("rejects missing database URLs with a readable message", () => {
    expect(() => parseServerEnv({})).toThrow(/DATABASE_URL/);
  });
  it("never reports a live model without provider, key and model", () => {
    expect(liveModelConfigured(parseServerEnv(base))).toBe(false);
    expect(liveModelConfigured(parseServerEnv({ ...base, LLM_PROVIDER: "openai", LLM_API_KEY: "k" }))).toBe(false);
    expect(liveModelConfigured(parseServerEnv({ ...base, LLM_PROVIDER: "openai", LLM_API_KEY: "k", LLM_MODEL: "m" }))).toBe(true);
  });
  it("coerces numeric limits and rejects bad ones", () => {
    expect(parseServerEnv({ ...base, UPLOAD_MAX_MB: "25" }).UPLOAD_MAX_MB).toBe(25);
    expect(() => parseServerEnv({ ...base, UPLOAD_MAX_MB: "-1" })).toThrow();
  });
});

describe("job transitions", () => {
  it("mirrors the database trigger", () => {
    expect(canTransitionJob("queued", "running")).toBe(true);
    expect(canTransitionJob("queued", "succeeded")).toBe(false);
    expect(canTransitionJob("succeeded", "queued")).toBe(false);
    expect(canTransitionJob("running", "queued")).toBe(true);
  });
});
