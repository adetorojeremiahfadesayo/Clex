import { z } from "zod";

const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const positiveInt = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback);

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "test", "preview", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  // Privileged connection used only by migrations and db:setup.
  DATABASE_URL: z.string().min(1),
  // RLS-bound connection used by the web server for tenant data.
  APP_DATABASE_URL: z.string().min(1),
  // Worker connection. BYPASSRLS is expected; authorisation is re-checked in code.
  WORKER_DATABASE_URL: z.string().min(1).optional(),
  LLM_PROVIDER: z.enum(["none", "openai", "anthropic"]).default("none"),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  DEMO_MODE: bool,
  UPLOAD_MAX_MB: positiveInt(10),
  DOCUMENT_MAX_PAGES: positiveInt(50),
  JOB_MAX_ATTEMPTS: positiveInt(3),
  GENERATION_TIMEOUT_SECONDS: positiveInt(90),
  SESSION_TTL_HOURS: positiveInt(24 * 14),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${issues}`);
  }
  return result.data;
}

/** True only when a real model provider and key are configured. Never infer from mocks. */
export function liveModelConfigured(env: ServerEnv): boolean {
  return env.LLM_PROVIDER !== "none" && !!env.LLM_API_KEY && !!env.LLM_MODEL;
}
