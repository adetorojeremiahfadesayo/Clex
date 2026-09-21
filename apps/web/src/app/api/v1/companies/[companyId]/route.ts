import { NextResponse } from "next/server";
import { uuidSchema } from "@lex/domain";
import { getCompany, listMemberships } from "@lex/db";
import { ApiError, handle, requireUser } from "@/lib/api";
import { asActor } from "@/lib/db";

type Ctx = { params: Promise<{ companyId: string }> };

export const GET = handle(async (_request: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { companyId } = await ctx.params;
  if (!uuidSchema.safeParse(companyId).success) throw new ApiError(404, "not_found", "Company not found");
  // RLS returns nothing for non-members; 404 (not 403) avoids confirming existence (A14).
  const result = await asActor(user.id, async (db) => {
    const company = await getCompany(db, companyId);
    if (!company) return null;
    return { company, memberships: await listMemberships(db, companyId) };
  });
  if (!result) throw new ApiError(404, "not_found", "Company not found");
  return NextResponse.json(result);
});
