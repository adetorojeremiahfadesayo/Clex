import { NextResponse } from "next/server";
import { sourceVersionInputSchema, uuidSchema } from "@lex/domain";
import { addSourceVersion } from "@lex/db";
import { ApiError, handle, parseBody } from "@/lib/api";
import { requirePlatformRole } from "@/lib/content-authz";
import { asActor } from "@/lib/db";

export const POST = handle(async (request: Request, ctx: { params: Promise<{ sourceId: string }> }) => {
  const { user } = await requirePlatformRole(["content_editor", "content_reviewer"]);
  const { sourceId } = await ctx.params;
  if (!uuidSchema.safeParse(sourceId).success) throw new ApiError(404, "not_found", "Source not found");
  const input = await parseBody(request, sourceVersionInputSchema);
  const version = await asActor(user.id, (db) => addSourceVersion(db, sourceId, input, user.id));
  return NextResponse.json({ version }, { status: 201 });
});
