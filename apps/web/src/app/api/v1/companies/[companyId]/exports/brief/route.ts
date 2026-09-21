import { recordAudit } from "@lex/db";
import { handle, requireUser } from "@/lib/api";
import { resolveCompanyForActor } from "@/lib/authz";
import { renderBriefHtml } from "@/lib/brief";
import { buildChecklistView } from "@/lib/checklist-view";
import { loadCompanyStart } from "@/lib/company-start";
import { asActor } from "@/lib/db";

type Ctx = { params: Promise<{ companyId: string }> };

/** Version-specific printable brief, rendered on demand for the authorised member. */
export const GET = handle(async (_request: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { companyId } = await ctx.params;
  const { company } = await resolveCompanyForActor(companyId, user.id);
  const generatedAt = new Date().toISOString();
  const html = await asActor(user.id, async (db) => {
    const data = await loadCompanyStart(db, companyId);
    await recordAudit(db, {
      companyId, actorId: user.id, action: "export.brief_rendered", objectType: "profile_revision",
      objectId: data.revision?.id ?? "none", objectVersion: String(data.revision?.version ?? 0),
    });
    return renderBriefHtml(company, data, buildChecklistView(data, data.pack), generatedAt);
  });
  const safeName = company.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `inline; filename="preparation-brief-${safeName}-v${(await asActor(user.id, (db) => loadCompanyStart(db, companyId))).revision?.version ?? 0}.html"`,
      "cache-control": "no-store",
    },
  });
});
