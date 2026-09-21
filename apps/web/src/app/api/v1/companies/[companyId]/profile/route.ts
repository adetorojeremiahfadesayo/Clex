import { NextResponse } from "next/server";
import { confirmAnswersInputSchema, intakeViews } from "@lex/domain";
import { getCurrentRevision, listRevisions } from "@lex/db";
import { ApiError, handle, parseBody, requireUser } from "@/lib/api";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";
import { confirmAnswersAndAssess } from "@/lib/company-start";

type Ctx = { params: Promise<{ companyId: string }> };

export const GET = handle(async (_request: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { companyId } = await ctx.params;
  await resolveCompanyForActor(companyId, user.id);
  const data = await asActor(user.id, async (db) => ({
    current: await getCurrentRevision(db, companyId),
    history: await listRevisions(db, companyId),
  }));
  const facts = data.current?.facts ?? {};
  return NextResponse.json({
    revision: data.current,
    history: data.history.map((r) => ({ id: r.id, version: r.version, reason: r.reason, createdAt: r.createdAt, confirmedBy: r.confirmedBy })),
    questions: intakeViews(facts).map((v) => ({ key: v.question.key, group: v.question.group, prompt: v.prompt, state: v.state, current: v.current })),
  });
});

/** Confirms answers as a new revision. `If-Match` must equal the current version (optimistic check). */
export const PATCH = handle(async (request: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { companyId } = await ctx.params;
  const { role } = await resolveCompanyForActor(companyId, user.id);
  if (role === "reviewer") throw new ApiError(403, "forbidden", "Reviewers cannot change company facts");
  const input = await parseBody(request, confirmAnswersInputSchema);
  const ifMatch = request.headers.get("if-match");
  const result = await asActor(user.id, async (db) => {
    const current = await getCurrentRevision(db, companyId);
    const currentVersion = current?.version ?? 0;
    if (ifMatch !== null && Number(ifMatch) !== currentVersion) {
      throw new ApiError(409, "version_conflict", `Profile is at version ${currentVersion}, not ${ifMatch}`);
    }
    return confirmAnswersAndAssess(db, { companyId, actorId: user.id, answers: input.answers, reason: input.reason });
  });
  return NextResponse.json({ revision: result.revision, assessment: result.assessment, checklist: result.items }, { status: 201 });
});
