import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentRevision, getMatter, listMatterAnalyses, listMatterChatMessages, listMatterDocuments, listMatterDrafts } from "@lex/db";
import { answeredString, type FactKey, intakeQuestions, uuidSchema } from "@lex/domain";
import { AgentWorkspace } from "@/components/agent-workspace";
import { isConversation, conversationSource } from "@/lib/agent";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";
import { env } from "@/lib/env";
import { moduleById } from "@/lib/modules";
import { moduleViews, statusLabels } from "@/lib/compliance";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MatterPage({ params, searchParams }: { params: Promise<{ companyId: string; matterId: string }>; searchParams: Promise<{ demo?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/");
  const { companyId, matterId } = await params;
  if (!uuidSchema.safeParse(companyId).success || !uuidSchema.safeParse(matterId).success) notFound();
  const demoMode = (await searchParams).demo === "1";
  const { company, role } = await resolveCompanyForActor(companyId, user.id);
  const data = await asActor(user.id, async (db) => {
    const matter = await getMatter(db, companyId, matterId);
    if (!matter) return null;
    const [revision, documents, drafts, analyses, history] = await Promise.all([
      getCurrentRevision(db, companyId), listMatterDocuments(db, companyId, matterId), listMatterDrafts(db, companyId, matterId),
      listMatterAnalyses(db, companyId, matterId), listMatterChatMessages(db, companyId, matterId),
    ]);
    return { matter, revision, documents, drafts, analyses, history };
  });
  if (!data) notFound();
  const { matter } = data;
  const mod = moduleById(matter.context.topic);
  const config = env();
  const modelReady = config.LLM_PROVIDER !== "none" && !!config.LLM_API_KEY && !!config.LLM_MODEL;
  const latest = [...data.analyses].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const latestDraft = [...data.drafts].sort((a, b) => b.version - a.version)[0];
  const q = demoMode ? "?demo=1" : "";
  const view = mod ? moduleViews([{ matter, documents: data.documents, analyses: data.analyses, drafts: data.drafts }], []).find((v) => v.module.id === mod.id) : undefined;
  const sources = data.documents.map((d) => ({ id: d.id, name: d.filename, readable: d.extractionStatus === "readable", type: isConversation(d) ? conversationSource(d) : "Document" }));
  const memoryFields: [FactKey, string][] = [["formation_country","Formation country"],["formation_subdivision","Region"],["operating_locations","Operating locations"],["industry","Industry"],["activities","Business activity"],["registration_status","Registration status"],["hiring_plan","Hiring plan"],["has_suppliers","Suppliers"],["customer_data","Customer data"]];
  const companyMemory = memoryFields.flatMap(([key,label]) => {
    const raw=answeredString(data.revision?.facts ?? {},key);
    if(!raw)return [];
    const value=intakeQuestions.find((question)=>question.key===key)?.options?.find((option)=>option.value===raw)?.label ?? raw;
    return [{label,value}];
  });

  return (
    <section className="clex-page">
      <nav className="clex-breadcrumb" aria-label="Breadcrumb"><Link href="/">Companies</Link> <span aria-hidden="true">/</span> <Link href={`/companies/${companyId}/run${q}`}>{company.name}</Link> <span aria-hidden="true">/</span> {matter.title}</nav>
      <header className="clex-agent-head">
        <div>
          <p className="eyebrow">{mod ? "Run your company" : matter.kind}</p>
          <h1 className="clex-h1">{matter.title}</h1>
          <p className="clex-muted">{mod?.blurb ?? matter.summary}</p>
        </div>
        <div className="clex-row">
          <Link className="button-ghost" href={`/companies/${companyId}/run${q}`}>← Compliance dashboard</Link>
          <a className="button-secondary" href={`/api/v1/companies/${companyId}/matters/${matterId}/export`} target="_blank" rel="noopener">Open lawyer packet ↗</a>
        </div>
      </header>
      {view && (
        <ol className={`clex-task-strip is-${mod!.accent}`} aria-label={`${mod!.title} tasks`}>
          <li className={`clex-status is-${view.status}`}>{statusLabels[view.status]}</li>
          {view.tasks.map((t, i) => <li key={t.label} className={t.done ? "is-done" : ""}><span aria-hidden="true">{t.done ? "✓" : i + 1}</span>{t.label}</li>)}
        </ol>
      )}
      <AgentWorkspace
        companyId={companyId}
        matterId={matterId}
        moduleTitle={mod?.title ?? matter.title}
        asks={mod?.asks ?? ["What should I raise with my lawyer?", "Draft a letter"]}
        sample={mod?.sample ?? null}
        sources={sources}
        latest={latest ? { mode: latest.mode, findings: latest.findings, questions: latest.questions } : null}
        draft={latestDraft ? { body: latestDraft.body, version: latestDraft.version } : null}
        canEdit={role !== "reviewer"}
        modelReady={modelReady}
        demoMode={demoMode}
        companyMemory={companyMemory}
        history={data.history.map(({id,role,body,findings,questions,mode,draftVersion})=>({id,role,body,findings,questions,mode,draftVersion}))}
      />
    </section>
  );
}
