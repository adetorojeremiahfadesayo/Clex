import { NextResponse } from "next/server";
import { z } from "zod";
import { createMatterAnalysis, createMatterDraft, getCurrentRevision, getMatter, listMatterDocuments, recordAudit } from "@lex/db";
import { uuidSchema } from "@lex/domain";
import { ApiError, handle, parseBody, requireUser } from "@/lib/api";
import { isConversation, runAgent } from "@/lib/agent";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";
import { env } from "@/lib/env";

type Context = { params: Promise<{ companyId: string; matterId: string }> };
const inputSchema = z.object({ message: z.string().trim().min(1).max(2000), allowExternalProcessing: z.boolean().default(false) });

export const POST = handle(async (request: Request, { params }: Context) => {
  const user = await requireUser();
  const { companyId, matterId } = await params;
  if (!uuidSchema.safeParse(companyId).success || !uuidSchema.safeParse(matterId).success) throw new ApiError(404, "not_found", "Matter not found");
  const company = await resolveCompanyForActor(companyId, user.id);
  if (company.role === "reviewer") throw new ApiError(403, "forbidden", "Reviewer cannot run the agent");
  const input = await parseBody(request, inputSchema);
  const config = env();
  const live = config.LLM_PROVIDER !== "none" && !!config.LLM_API_KEY && !!config.LLM_MODEL;
  if (live && !input.allowExternalProcessing) throw new ApiError(422, "consent_required", "Confirm sending your sources to the model provider first");
  const data = await asActor(user.id, async (db) => {
    const matter = await getMatter(db, companyId, matterId);
    if (!matter) throw new ApiError(404, "not_found", "Matter not found");
    return { matter, docs: await listMatterDocuments(db, companyId, matterId), revision: await getCurrentRevision(db, companyId) };
  });
  let result: Awaited<ReturnType<typeof runAgent>>;
  try {
    result = await runAgent({ matter: data.matter, facts: data.revision?.facts ?? {}, docs: data.docs, companyName: company.company.name, message: input.message, config });
  } catch (error) {
    // No canned fallback: the user sees the failure and can retry.
    return NextResponse.json({ error: { code: "agent_failed", message: error instanceof Error ? error.message.slice(0, 200) : "The agent failed. Try again." } }, { status: 503 });
  }
  const saved = await asActor(user.id, async (db) => {
    if (!result.sourceCount) return { analysis: null, draft: null };
    const primary = data.docs.find((d) => !isConversation(d) && d.extractionStatus === "readable") ?? null;
    const analysis = await createMatterAnalysis(db, { companyId, matterId, documentId: primary?.id ?? null, profileRevisionId: data.revision?.id ?? null, mode: result.mode, status: "needs_review", findings: result.findings, questions: result.questions, provider: result.mode === "live" ? config.LLM_PROVIDER : undefined, model: result.mode === "live" ? config.LLM_MODEL : undefined, actorId: user.id });
    const draft = result.letter ? await createMatterDraft(db, companyId, matterId, result.letter, user.id) : null;
    await recordAudit(db, { companyId, actorId: user.id, action: "matter.agent_run", objectType: "matter", objectId: matterId, objectVersion: analysis.id, summary: { mode: result.mode, sources: result.sourceCount, drafted: !!draft } });
    return { analysis, draft };
  });
  return NextResponse.json({ reply: result.reply, mode: result.mode, findings: result.findings, questions: result.questions, draft: saved.draft }, { status: 201 });
});
