import { NextResponse } from "next/server";
import { packVersionContentSchema, uuidSchema } from "@lex/domain";
import { updateDraftContent } from "@lex/db";
import { ApiError, handle, parseBody } from "@/lib/api";
import { requirePlatformRole } from "@/lib/content-authz";
import { asActor } from "@/lib/db";

/** Content edits are only possible while the version is a draft; the hash changes and prior evaluations no longer count. */
export const PUT = handle(async (request: Request, ctx: { params: Promise<{ versionId: string }> }) => {
  const { user } = await requirePlatformRole(["content_editor", "content_reviewer"]);
  const { versionId } = await ctx.params;
  if (!uuidSchema.safeParse(versionId).success) throw new ApiError(404, "not_found", "Pack version not found");
  const content = await parseBody(request, packVersionContentSchema);
  const version = await asActor(user.id, (db) => updateDraftContent(db, versionId, content));
  if (!version) throw new ApiError(409, "not_draft", "Only draft versions can be edited");
  return NextResponse.json({ version });
});
