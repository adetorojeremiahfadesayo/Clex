import { parseServerEnv, type ServerEnv } from "@lex/domain";

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  const adminUrl = process.env.DATABASE_URL;
  let appUrl = process.env.APP_DATABASE_URL;
  if (!appUrl && adminUrl && process.env.LEX_APP_PASSWORD) {
    const derived = new URL(adminUrl);
    derived.username = "lex_app";
    derived.password = process.env.LEX_APP_PASSWORD;
    appUrl = derived.toString();
  }
  cached ??= parseServerEnv({
    ...process.env,
    APP_DATABASE_URL: appUrl,
    APP_URL: process.env.APP_URL ?? process.env.RENDER_EXTERNAL_URL,
  });
  return cached;
}
