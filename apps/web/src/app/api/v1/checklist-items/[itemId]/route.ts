import { NextResponse } from "next/server";
import { checkChecklistTransition, checklistTransitionInputSchema, uuidSchema } from "@lex/domain";
import { VersionConflictError, applyChecklistTransition, getChecklistItem, recordAudit } from "@lex/db";
import { ApiError, handle, parseBody, requireUser } from "@/lib/api";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";

type Ctx = { params: Promise<{ itemId: string }> };

export const PATCH = handle(async (request: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { itemId } = await ctx.params;
  if (!uuidSchema.safeParse(itemId).success) throw new ApiError(404, "not_found", "Checklist item not found");
  const input = await parseBody(request, checklistTransitionInputSchema);
  // RLS hides items of other companies; the role check uses the item's own company, never a client value.
  const item = await asActor(user.id, (db) => getChecklistItem(db, itemId));
  if (!item) throw new ApiError(404, "not_found", "Checklist item not found");
  const { role } = await resolveCompanyForActor(item.companyId, user.id);
  const check = checkChecklistTransition(item.status, input.to, role, input);
  if (!check.ok) throw new ApiError(422, "invalid_transition", check.error!);
  try {
    const updated = await asActor(user.id, async (db) => {
      const next = await applyChecklistTransition(db, { itemId, actorId: user.id, ...input });
      await recordAudit(db, {
        companyId: item.companyId,
        actorId: user.id,
        action: "checklist.transition",
        objectType: "checklist_item",
        objectId: itemId,
        objectVersion: String(next.version),
        summary: { from: item.status, to: next.status, role },
      });
      return next;
    });
    return NextResponse.json({ item: updated });
  } catch (error) {
    if (error instanceof VersionConflictError) throw new ApiError(409, "version_conflict", error.message);
    throw error;
  }
});
