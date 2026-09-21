import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { intakeQuestions, uuidSchema } from "@lex/domain";
import { getCompany, listMemberships } from "@lex/db";
import { ChecklistItemCard, type ChecklistCardData } from "@/components/checklist-item-card";
import { RegenerateButton } from "@/components/regenerate-button";
import { buildChecklistView, type ChecklistEntry } from "@/lib/checklist-view";
import { loadCompanyStart } from "@/lib/company-start";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const promptFor = (key: string) => intakeQuestions.find((q) => q.key === key)?.prompt ?? key;

function toCard(e: ChecklistEntry): ChecklistCardData {
  return {
    id: e.item.id,
    version: e.item.version,
    status: e.item.status,
    evidence: e.item.evidence,
    reason: e.item.reason,
    action: e.rule.action,
    why: e.decision?.reason ?? e.rule.whyGeneric,
    applicability: e.decision?.applicability,
    gather: e.rule.gather,
    missingPrompts: (e.decision?.missingFactKeys ?? []).map(promptFor),
    sources: e.sources.map((s) => ({ id: s.id, authority: s.authority, title: s.title, url: s.url, checkedAt: s.checkedAt })),
    ruleVersion: e.item.ruleVersion,
  };
}

export default async function ChecklistPage({ params }: { params: Promise<{ companyId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { companyId } = await params;
  if (!uuidSchema.safeParse(companyId).success) notFound();
  const data = await asActor(user.id, async (db) => {
    const company = await getCompany(db, companyId);
    if (!company) return null;
    const memberships = await listMemberships(db, companyId);
    return { company, memberships, start: await loadCompanyStart(db, companyId) };
  });
  if (!data) notFound();
  const role = data.memberships.find((m) => m.userId === user.id && !m.revokedAt)?.role ?? "member";
  const view = buildChecklistView(data.start);

  return (
    <section className="space-y-6">
      <nav className="text-sm text-slate-600" aria-label="Breadcrumb">
        <Link href="/" className="underline">Companies</Link> /{" "}
        <Link href={`/companies/${companyId}/overview`} className="underline">{data.company.name}</Link> / Checklist
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Starting checklist</h1>
          <p className="text-sm text-slate-600">
            {view.progress.done} of {view.progress.applicable} applicable items completed · {view.progress.unknown} with unknown applicability
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/v1/companies/${companyId}/exports/brief`} target="_blank" rel="noopener" className="rounded border border-slate-300 px-3 py-2 text-sm">
            Open preparation brief
          </a>
          {role !== "reviewer" && <RegenerateButton companyId={companyId} stale={view.stale} disabled={!data.start.revision} />}
        </div>
      </div>
      <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{view.contentNotice}</p>
      {view.stale && (
        <p role="status" className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          The profile changed after this checklist was generated. Regenerate to reflect the latest confirmed facts.
        </p>
      )}
      {!data.start.revision && (
        <p className="rounded border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          No profile yet. <Link href={`/companies/${companyId}/profile`} className="underline">Answer intake questions</Link> to generate your checklist.
        </p>
      )}
      <ul className="space-y-3">
        {view.entries.map((e) => (
          <ChecklistItemCard key={e.item.id} data={toCard(e)} role={role} />
        ))}
      </ul>
      {view.superseded.length > 0 && (
        <details className="rounded border border-slate-200 bg-white p-4 text-sm">
          <summary className="cursor-pointer font-medium">No longer applicable ({view.superseded.length})</summary>
          <ul className="mt-2 space-y-1 text-slate-600">
            {view.superseded.map((e) => (
              <li key={e.item.id}>{e.rule.action} — {e.decision?.reason ?? "rule no longer applies to the confirmed facts"}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
