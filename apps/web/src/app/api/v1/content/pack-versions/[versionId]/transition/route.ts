import { NextResponse } from "next/server";
import { z } from "zod";
import { packStatusSchema, packTransitions, uuidSchema } from "@lex/domain";
import { getPackVersion, transitionPackVersion } from "@lex/db";
import { ApiError, handle, parseBody } from "@/lib/api";
import { requirePlatformRole } from "@/lib/content-authz";
import { asActor } from "@/lib/db";

const body = z.object({ to: packStatusSchema, reason: z.string().trim().max(500).optional() });

/**
 * Editors may submit for review or return to draft; only reviewers publish, mark stale or withdraw.
 * The database trigger independently enforces reviewer role, author ≠ reviewer and a passing evaluation.
 */
export const POST = handle(async (request: Request, ctx: { params: Promise<{ versionId: string }> }) => {
  const { user, role } = await requirePlatformRole(["content_editor", "content_reviewer"]);
  const { versionId } = await ctx.params;
  if (!uuidSchema.safeParse(versionId).success) throw new ApiError(404, "not_found", "Pack version not found");
  const input = await parseBody(request, body);
  const reviewerOnly = ["published", "stale", "withdrawn"].includes(input.to);
  if (reviewerOnly && role !== "content_reviewer") throw new ApiError(403, "forbidden", "Only a content reviewer can publish, mark stale or withdraw");
  try {
    const version = await asActor(user.id, async (db) => {
      const current = await getPackVersion(db, versionId);
      if (!current) throw new ApiError(404, "not_found", "Pack version not found");
      if (!packTransitions[current.status].includes(input.to)) throw new ApiError(422, "invalid_transition", `Cannot move from ${current.status} to ${input.to}`);
      if (input.to === "published" && current.authorId === user.id) throw new ApiError(422, "self_review", "The author cannot publish their own pack version");
      return transitionPackVersion(db, { versionId, to: input.to, reviewerId: reviewerOnly || input.to === "draft" ? user.id : undefined, reason: input.reason });
    });
    return NextResponse.json({ version });
  } catch (error) {
    if ((error as { code?: string }).code === "23514") throw new ApiError(422, "publication_gate", (error as Error).message);
    throw error;
  }
});
