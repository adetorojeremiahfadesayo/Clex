import { NextResponse } from "next/server";
import { z } from "zod";
import { createMatterAnalysis, createMatterChatMessage, createMatterDraft, getCurrentRevision, getMatter, listMatterDocuments, recordAudit } from "@lex/db";
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
  const data = await asActor(user.id, async (db) => {
    const matter = await getMatter(db, companyId, matterId);
    if (!matter) throw new ApiError(404, "not_found", "Matter not found");
    const [docs, revision, userMessage] = await Promise.all([
      listMatterDocuments(db, companyId, matterId), getCurrentRevision(db, companyId),
      createMatterChatMessage(db, { companyId, matterId, role: "user", body: input.message, actorId: user.id }),
    ]);
    return { matter, docs, revision, userMessage };
  });
  let result: Awaited<ReturnType<typeof runAgent>>;
  try {
    result = await runAgent({ matter: data.matter, facts: data.revision?.facts ?? {}, docs: data.docs, companyName: company.company.name, message: input.message, config, allowExternalProcessing: input.allowExternalProcessing });
  } catch (error) {
    // No canned fallback: the user sees the failure and can retry.
    await asActor(user.id, (db) => createMatterChatMessage(db, { companyId, matterId, role: "assistant", body: `Sorry, that didn't work: ${error instanceof Error ? error.message.slice(0, 500) : "The agent failed. Try again."}`, actorId: user.id }));
    return NextResponse.json({ error: { code: "agent_failed", message: error instanceof Error ? error.message.slice(0, 200) : "The agent failed. Try again." } }, { status: 503 });
  }
  const saved = await asActor(user.id, async (db) => {
    let analysis = null;
    let draft = null;
    if (result.sourceCount) {
      const primary = data.docs.find((d) => !isConversation(d) && d.extractionStatus === "readable") ?? null;
      analysis = await createMatterAnalysis(db, { companyId, matterId, documentId: primary?.id ?? null, profileRevisionId: data.revision?.id ?? null, mode: result.mode, status: "needs_review", findings: result.findings, questions: result.questions, provider: result.mode === "live" ? config.LLM_PROVIDER : undefined, model: result.mode === "live" ? config.LLM_MODEL : undefined, actorId: user.id });
      draft = result.letter ? await createMatterDraft(db, companyId, matterId, result.letter, user.id) : null;
      await recordAudit(db, { companyId, actorId: user.id, action: "matter.agent_run", objectType: "matter", objectId: matterId, objectVersion: analysis.id, summary: { mode: result.mode, sources: result.sourceCount, drafted: !!draft } });
    }
    const assistantMessage = await createMatterChatMessage(db, { companyId, matterId, role: "assistant", body: result.reply, findings: result.findings, questions: result.questions, mode: result.mode, draftVersion: draft?.version ?? null, actorId: user.id });
    return { analysis, draft, assistantMessage };
  });
  return NextResponse.json({ reply: result.reply, mode: result.mode, findings: result.findings, questions: result.questions, draft: saved.draft, messageId: saved.assistantMessage.id }, { status: 201 });
});
