import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentRevision, getMatter, listMatterActions, listMatterAnalyses, listMatterDocuments, listMatterDrafts } from "@lex/db";
import { answeredString, intakeQuestions, uuidSchema } from "@lex/domain";
import { MatterWorkbench } from "@/components/matter-workbench";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";
import { env } from "@/lib/env";
import { currentUser } from "@/lib/session";

export const dynamic="force-dynamic";
export default async function MatterPage({params}:{params:Promise<{companyId:string;matterId:string}>}){
  const user=await currentUser();if(!user)redirect("/api/guest?next=/");const {companyId,matterId}=await params;
  if(!uuidSchema.safeParse(companyId).success||!uuidSchema.safeParse(matterId).success)notFound();
  const {company,role}=await resolveCompanyForActor(companyId,user.id);
  const data=await asActor(user.id,async db=>{
    const matter=await getMatter(db,companyId,matterId);if(!matter)return null;
    const documents=await listMatterDocuments(db,companyId,matterId);
    const analyses=await listMatterAnalyses(db,companyId,matterId);
    const drafts=await listMatterDrafts(db,companyId,matterId);
    const actions=await listMatterActions(db,companyId,matterId);
    const revision=await getCurrentRevision(db,companyId);
    return {matter,documents,analyses,drafts,actions,revision};
  });
  if(!data)notFound();
  const {matter,documents,analyses,drafts,actions,revision}=data;
  const config=env();const modelReady=config.LLM_PROVIDER!=="none"&&!!config.LLM_API_KEY&&!!config.LLM_MODEL;
  const stale=!!revision&&!!matter.profileRevisionId&&revision.id!==matter.profileRevisionId;
  const profileFacts=revision?.facts??{};
  const facts=["formation_country","formation_subdivision","industry","activities","registration_status","worker_locations","customer_data"].map(key=>{
    const raw=answeredString(profileFacts,key as keyof typeof profileFacts);
    return {key,value:intakeQuestions.find(q=>q.key===key)?.options?.find(o=>o.value===raw)?.label??raw};
  }).filter(item=>item.value);
  return <section className="space-y-7"><nav className="text-sm text-slate-500"><Link href="/" className="underline">Companies</Link> / <Link href={`/companies/${companyId}/overview`} className="underline">{company.name}</Link> / <Link href={`/companies/${companyId}/matters`} className="underline">Matters</Link> / {matter.title}</nav>
    <header className="flex flex-wrap items-end justify-between gap-4"><div><span className="eyebrow">{matter.kind} / {matter.status.replaceAll("_"," ")}</span><h1 className="mt-2 text-3xl font-semibold">{matter.title}</h1><p className="mt-2 max-w-2xl text-slate-600">{matter.summary||"Add documents, run a review and collect questions for your adviser."}</p></div><a className="button-secondary" href={`/api/v1/companies/${companyId}/matters/${matterId}/export`} target="_blank" rel="noopener">Open lawyer packet ↗</a></header>
    {stale&&<p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">The company profile changed after this matter was created. Run a new analysis to use the latest confirmed facts. Earlier results remain historical.</p>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]"><div className="space-y-6"><MatterWorkbench companyId={companyId} matterId={matterId} documents={documents} drafts={drafts} actions={actions} modelReady={modelReady} canEdit={role!=="reviewer"}/>
      <section className="card p-6"><span className="eyebrow">Review history</span><h2 className="mt-1 text-xl font-semibold">Findings & questions</h2>{analyses.length?<div className="mt-4 space-y-5">{analyses.map(a=><article key={a.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{a.mode==="live"?"Live model analysis":"Local preparation"}</strong><span className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()} · {a.status.replaceAll("_"," ")}</span></div>{a.errorMessage&&<p className="mt-2 text-sm text-red-700">{a.errorMessage}</p>}{a.findings.length?<ul className="mt-3 space-y-3">{a.findings.map((f,i)=><li key={i} className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{f.title}</strong><p className="mt-1 text-slate-700">{f.explanation}</p><p className="mt-1 text-xs text-slate-500">Why for this company: {f.companyReason}</p>{f.documentExcerpt&&<blockquote className="mt-2 border-l-2 border-blue-300 pl-3 text-xs text-slate-600">From uploaded text: “{f.documentExcerpt}”</blockquote>}</li>)}</ul>:<p className="mt-2 text-sm text-slate-500">No findings recorded.</p>}{a.questions.length>0&&<div className="mt-4"><h3 className="text-sm font-semibold">Questions for your lawyer or team</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{a.questions.map((q,i)=><li key={i}>{q}</li>)}</ul></div>}<p className="mt-3 text-xs text-amber-800">Unreviewed. No determination of legal compliance or enforceability.</p></article>)}</div>:<p className="mt-3 text-sm text-slate-600">Run an analysis above to organise this matter around your company profile.</p>}</section>
    </div><aside className="space-y-4"><div className="card p-5"><span className="eyebrow">Company context</span><h2 className="mt-1 font-semibold">Facts behind this work</h2>{facts.length?<dl className="mt-3 space-y-3">{facts.map(f=><div key={f.key}><dt className="text-xs uppercase tracking-wide text-slate-500">{f.key.replaceAll("_"," ")}</dt><dd className="text-sm font-medium">{f.value}</dd></div>)}</dl>:<p className="mt-3 text-sm text-slate-600">No confirmed facts yet. <Link href={`/companies/${companyId}/profile`} className="underline">Complete the profile</Link> to make analyses more specific.</p>}<Link href={`/companies/${companyId}/profile`} className="mt-4 inline-block text-sm underline">Update company profile →</Link></div><div className="card p-5 text-sm"><strong>How to use this</strong><ol className="mt-2 list-decimal space-y-2 pl-5 text-slate-600"><li>Describe the matter and upload a document if you have one.</li><li>Read company-specific observations and open questions.</li><li>Edit a working draft and export a packet for counsel.</li></ol></div></aside></div>
  </section>;
}
