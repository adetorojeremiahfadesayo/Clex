import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMatter, listMatterAnalyses, listMatterDocuments, listMatterDrafts } from "@lex/db";
import { uuidSchema } from "@lex/domain";
import { AgentWorkspace } from "@/components/agent-workspace";
import { isConversation, conversationSource } from "@/lib/agent";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";
import { env } from "@/lib/env";
import { moduleById } from "@/lib/modules";
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
    return { matter, documents: await listMatterDocuments(db, companyId, matterId), drafts: await listMatterDrafts(db, companyId, matterId), analyses: await listMatterAnalyses(db, companyId, matterId) };
  });
  if (!data) notFound();
  const { matter } = data;
  const mod = moduleById(matter.context.topic);
  const config = env();
  const modelReady = config.LLM_PROVIDER !== "none" && !!config.LLM_API_KEY && !!config.LLM_MODEL;
  const latest = [...data.analyses].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const latestDraft = [...data.drafts].sort((a, b) => b.version - a.version)[0];
  const q = demoMode ? "?demo=1" : "";
  const sources = data.documents.map((d) => ({ id: d.id, name: d.filename, readable: d.extractionStatus === "readable", type: isConversation(d) ? conversationSource(d) : "Document" }));

  return (
    <section className="clex-page">
      <nav className="clex-breadcrumb" aria-label="Breadcrumb"><Link href="/">Companies</Link> <span aria-hidden="true">/</span> <Link href={`/companies/${companyId}/run${q}`}>{company.name}</Link> <span aria-hidden="true">/</span> {matter.title}</nav>
      <header className="clex-agent-head">
        <div>
          <p className="eyebrow">{mod ? "Run your company" : matter.kind}</p>
          <h1 className="clex-h1">{matter.title}</h1>
          <p className="clex-muted">{mod?.blurb ?? matter.summary}</p>
        </div>
        <a className="button-secondary" href={`/api/v1/companies/${companyId}/matters/${matterId}/export`} target="_blank" rel="noopener">Open lawyer packet ↗</a>
      </header>
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
      />
    </section>
  );
}
