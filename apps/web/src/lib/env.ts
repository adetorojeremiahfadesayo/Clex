import { parseServerEnv, type ServerEnv } from "@lex/domain";

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  cached ??= parseServerEnv();
  return cached;
}
