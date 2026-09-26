import { parseServerEnv, type ServerEnv } from "@lex/domain";

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  cached ??= parseServerEnv({
    ...process.env,
    APP_URL: process.env.APP_URL ?? process.env.RENDER_EXTERNAL_URL,
  });
  return cached;
}
