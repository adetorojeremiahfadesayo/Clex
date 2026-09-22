import type { PlatformRole } from "@lex/domain";
import { getPlatformRole } from "@lex/db";
import { ApiError, requireUser } from "./api";
import { asActor } from "./db";

/** Platform content roles are separate from company membership; never derived from client input. */
export async function requirePlatformRole(allowed: PlatformRole[]) {
  const user = await requireUser();
  const role = await asActor(user.id, (db) => getPlatformRole(db, user.id));
  if (!allowed.includes(role)) throw new ApiError(403, "forbidden", "Content editor or reviewer role required");
  return { user, role };
}
