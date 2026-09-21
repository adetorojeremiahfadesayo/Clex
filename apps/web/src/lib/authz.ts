import { type Membership, uuidSchema } from "@lex/domain";
import { getCompany, listMemberships } from "@lex/db";
import { ApiError } from "./api";
import { asActor } from "./db";

/** Resolves a company the actor can see, plus the actor's own active role. 404 otherwise (A14). */
export async function resolveCompanyForActor(companyId: string, userId: string) {
  if (!uuidSchema.safeParse(companyId).success) throw new ApiError(404, "not_found", "Company not found");
  const result = await asActor(userId, async (db) => {
    const company = await getCompany(db, companyId);
    if (!company) return null;
    const memberships = await listMemberships(db, companyId);
    return { company, memberships };
  });
  if (!result) throw new ApiError(404, "not_found", "Company not found");
  const mine = result.memberships.find((m: Membership) => m.userId === userId && !m.revokedAt);
  if (!mine) throw new ApiError(404, "not_found", "Company not found");
  return { ...result, role: mine.role };
}
