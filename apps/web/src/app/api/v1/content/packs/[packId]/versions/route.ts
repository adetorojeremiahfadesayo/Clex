import { NextResponse } from "next/server";
import { packVersionContentSchema, uuidSchema } from "@lex/domain";
import { createDraftVersion } from "@lex/db";
import { ApiError, handle, parseBody } from "@/lib/api";
import { requirePlatformRole } from "@/lib/content-authz";
import { asActor } from "@/lib/db";

export const POST = handle(async (request: Request, ctx: { params: Promise<{ packId: string }> }) => {
  const { user } = await requirePlatformRole(["content_editor", "content_reviewer"]);
  const { packId } = await ctx.params;
  if (!uuidSchema.safeParse(packId).success) throw new ApiError(404, "not_found", "Pack not found");
  const content = await parseBody(request, packVersionContentSchema);
  const version = await asActor(user.id, (db) => createDraftVersion(db, packId, content, user.id));
  return NextResponse.json({ version }, { status: 201 });
});
