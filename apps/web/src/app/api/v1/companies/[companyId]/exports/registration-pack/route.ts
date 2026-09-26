import { recordAudit } from "@lex/db";
import { uuidSchema } from "@lex/domain";
import { ApiError, handle, requireUser } from "@/lib/api";
import { resolveCompanyForActor } from "@/lib/authz";
import { buildChecklistView } from "@/lib/checklist-view";
import { loadCompanyStart } from "@/lib/company-start";
import { asActor } from "@/lib/db";
import { renderRegistrationPack } from "@/lib/registration-pack";

type Ctx = { params: Promise<{ companyId: string }> };

export const GET = handle(async (_request: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { companyId } = await ctx.params;
  if (!uuidSchema.safeParse(companyId).success) throw new ApiError(404, "not_found", "Company not found");
  const { company } = await resolveCompanyForActor(companyId, user.id);
  const data = await asActor(user.id, async (db) => {
    const start = await loadCompanyStart(db, companyId);
    if (!start.revision) throw new ApiError(409, "profile_required", "Save your company answers first");
    await recordAudit(db, { companyId, actorId: user.id, action: "export.registration_pack", objectType: "profile_revision", objectId: start.revision.id, objectVersion: String(start.revision.version) });
    return start;
  });
  const bytes = await renderRegistrationPack(company, data, buildChecklistView(data, data.pack), new Date().toISOString());
  const safeName = company.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${safeName}-registration-pack-v${data.revision?.version ?? 0}.pdf"`,
      "cache-control": "no-store",
    },
  });
});
