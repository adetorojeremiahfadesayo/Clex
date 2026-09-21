import { NextResponse } from "next/server";
import { z } from "zod";
import { evalCaseSchema, uuidSchema } from "@lex/domain";
import { getPackVersion, recordEvaluation } from "@lex/db";
import { evaluatePack } from "@lex/content";
import { ApiError, handle, parseBody } from "@/lib/api";
import { requirePlatformRole } from "@/lib/content-authz";
import { asActor } from "@/lib/db";

const body = z.object({ cases: z.array(evalCaseSchema).min(1) });

/** Runs reviewer-authored cases against the exact content hash and records the result. */
export const POST = handle(async (request: Request, ctx: { params: Promise<{ versionId: string }> }) => {
  const { user } = await requirePlatformRole(["content_editor", "content_reviewer"]);
  const { versionId } = await ctx.params;
  if (!uuidSchema.safeParse(versionId).success) throw new ApiError(404, "not_found", "Pack version not found");
  const input = await parseBody(request, body);
  const result = await asActor(user.id, async (db) => {
    const version = await getPackVersion(db, versionId);
    if (!version) throw new ApiError(404, "not_found", "Pack version not found");
    const report = evaluatePack(version.content, input.cases);
    const row = await recordEvaluation(db, { packVersionId: versionId, contentHash: version.contentHash, total: report.total, passed: report.passed, failures: report.failures, runBy: user.id });
    return { report, evaluationId: row.id, contentHash: version.contentHash };
  });
  return NextResponse.json(result, { status: 201 });
});
