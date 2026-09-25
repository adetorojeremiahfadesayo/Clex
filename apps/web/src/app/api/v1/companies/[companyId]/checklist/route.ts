import { NextResponse } from "next/server";
import { handle, requireUser } from "@/lib/api";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";
import { loadCompanyStart } from "@/lib/company-start";
import { buildChecklistView } from "@/lib/checklist-view";

type Ctx = { params: Promise<{ companyId: string }> };

export const GET = handle(async (_request: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { companyId } = await ctx.params;
  await resolveCompanyForActor(companyId, user.id);
  const data = await asActor(user.id, (db) => loadCompanyStart(db, companyId));
  return NextResponse.json(buildChecklistView(data, data.pack));
});
