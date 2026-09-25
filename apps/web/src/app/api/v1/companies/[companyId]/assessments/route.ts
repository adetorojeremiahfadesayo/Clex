import { NextResponse } from "next/server";
import { getCurrentRevision } from "@lex/db";
import { ApiError, handle, requireUser } from "@/lib/api";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";
import { loadCompanyStart, regenerateAssessment } from "@/lib/company-start";

type Ctx = { params: Promise<{ companyId: string }> };

export const GET = handle(async (_request: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { companyId } = await ctx.params;
  await resolveCompanyForActor(companyId, user.id);
  const data = await asActor(user.id, (db) => loadCompanyStart(db, companyId));
  return NextResponse.json({ assessment: data.assessment, stale: data.stale });
});

/** Regenerates the assessment for the current revision. Synchronous: the rules are deterministic and local. */
export const POST = handle(async (_request: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { companyId } = await ctx.params;
  const { role } = await resolveCompanyForActor(companyId, user.id);
  if (role === "reviewer") throw new ApiError(403, "forbidden", "Reviewers cannot regenerate assessments");
  const result = await asActor(user.id, async (db) => {
    const revision = await getCurrentRevision(db, companyId);
    if (!revision) throw new ApiError(409, "no_profile", "Confirm at least one intake answer first");
    return regenerateAssessment(db, { companyId, actorId: user.id, revisionId: revision.id, facts: revision.facts });
  });
  return NextResponse.json({ assessment: result.assessment, checklist: result.items }, { status: 201 });
});
