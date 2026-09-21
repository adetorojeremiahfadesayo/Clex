import { NextResponse } from "next/server";
import { uuidSchema } from "@lex/domain";
import { markSourceVersionReviewed } from "@lex/db";
import { ApiError, handle } from "@/lib/api";
import { requirePlatformRole } from "@/lib/content-authz";
import { asActor } from "@/lib/db";

export const POST = handle(async (_request: Request, ctx: { params: Promise<{ versionId: string }> }) => {
  const { user } = await requirePlatformRole(["content_reviewer"]);
  const { versionId } = await ctx.params;
  if (!uuidSchema.safeParse(versionId).success) throw new ApiError(404, "not_found", "Source version not found");
  const ok = await asActor(user.id, (db) => markSourceVersionReviewed(db, versionId, user.id));
  if (!ok) throw new ApiError(409, "not_reviewable", "Source version is not in unreviewed state");
  return NextResponse.json({ ok: true });
});
