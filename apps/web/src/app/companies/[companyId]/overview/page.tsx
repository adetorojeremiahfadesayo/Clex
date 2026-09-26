import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { type FactKey, intakeProgress, intakeQuestions, lifecycleStageLabels, uuidSchema } from "@lex/domain";
import { findRule } from "@lex/content";
import { getCompany } from "@lex/db";
import { buildChecklistView } from "@/lib/checklist-view";
import { loadCompanyStart } from "@/lib/company-start";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { ClexaGuide } from "@/components/clexa-guide";

export const dynamic = "force-dynamic";

const promptFor = (key: FactKey) => intakeQuestions.find((q) => q.key === key)?.prompt ?? key;

export default async function OverviewPage({ params }: { params: Promise<{ companyId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/");
  const { companyId } = await params;
  if (!uuidSchema.safeParse(companyId).success) notFound();
  const data = await asActor(user.id, async (db) => {
    const company = await getCompany(db, companyId);
    if (!company) return null;
    return { company, start: await loadCompanyStart(db, companyId) };
  });
  if (!data) notFound();
  const { company, start } = data;
  const facts = start.revision?.facts ?? {};
  const progress = intakeProgress(facts);
  const view = buildChecklistView(start, start.pack);
  const result = start.assessment?.result;
  const nextSteps = view.entries.filter((e) => !["user_completed", "reviewer_verified", "dismissed_with_reason"].includes(e.item.status)).slice(0, 3);
  const primaryStep = !start.revision
    ? { label: "Complete company profile", href: `/companies/${company.id}/profile`, description: "Tell us where you operate and what the business does. Unknown answers are okay." }
    : nextSteps.length
      ? { label: "Review starting checklist", href: `/companies/${company.id}/checklist`, description: "See what to prepare now, with reasons tied to your confirmed answers." }
      : { label: "Prepare a contract or decision", href: `/companies/${company.id}/matters`, description: "Bring a hiring, supplier or other legal matter into this company workspace." };

  return (
    <section className="space-y-6">
      <nav className="text-sm text-slate-600" aria-label="Breadcrumb">
        <Link href="/" className="underline">Companies</Link> / {company.name}
      </nav>
      <div><p className="eyebrow">Company workspace</p><h1 className="clex-overview-title mt-2">{company.name}</h1><p className="clex-status-pill">{lifecycleStageLabels[company.lifecycleStage]}</p></div>

      <ClexaGuide title={primaryStep.label} description={primaryStep.description} href={primaryStep.href} action="Continue" />
      <ol className="flex flex-wrap gap-x-5 gap-y-2 border-b border-[var(--color-rule)] pb-4 text-xs font-bold text-[var(--color-ink-2)]" aria-label="Company journey"><li><Link href={`/companies/${company.id}/profile`} className="hover:underline">01 Company profile</Link></li><li><Link href={`/companies/${company.id}/checklist`} className="hover:underline">02 Starting checklist</Link></li><li><Link href={`/companies/${company.id}/matters`} className="hover:underline">03 Contracts & matters</Link></li></ol>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded border border-slate-200 bg-white p-4">
          <h2 className="font-medium">Current position</h2>
          {result ? (
            <dl className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded bg-emerald-50 p-2"><dt className="text-xs text-emerald-800">Confirmed facts</dt><dd className="text-xl font-semibold">{result.confirmedFactKeys.length}</dd></div>
              <div className="rounded bg-amber-50 p-2"><dt className="text-xs text-amber-800">Not sure</dt><dd className="text-xl font-semibold">{result.unknownFactKeys.length}</dd></div>
              <div className="rounded bg-slate-100 p-2"><dt className="text-xs text-slate-700">Not yet asked</dt><dd className="text-xl font-semibold">{progress.applicable - progress.answered}</dd></div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-600">No facts confirmed yet. Start with the profile to get a current-position assessment.</p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            {result ? `Assessment ${start.stale ? "is stale (profile changed since)" : "matches profile revision " + start.revision?.version} · mode ${result.mode} · ${result.contentVersion}` : "Readiness is shown as completed applicable items over a visible denominator; there is no compliance score."}
          </p>
          <Link href={`/companies/${company.id}/profile`} className="mt-3 inline-block text-sm underline">
            {start.revision ? "Update profile" : "Start profile"}
          </Link>
        </article>

        <article className="rounded border border-slate-200 bg-white p-4">
          <h2 className="font-medium">Coverage</h2>
          <p className="mt-2 text-sm text-slate-700">{result?.coverage.notice ?? "Select a formation market in the profile to see which official directories apply."}</p>
          {start.packStale && (
            <p className="mt-2 text-sm text-red-800">Content pack used for the last assessment is {start.pack?.version.status.replace(/_/g, " ")}; regenerate from the checklist.</p>
          )}
          {result && (
            <p className="mt-2 text-xs text-slate-500">
              Pack status: {result.coverage.packStatus.replace(/_/g, " ")} · capabilities: {result.coverage.capabilities.map((c) => c.replace(/_/g, " ")).join(", ")}
            </p>
          )}
        </article>
      </div>

      <article className="rounded border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-medium">Next steps</h2>
          <span className="text-sm text-slate-600">{view.progress.done}/{view.progress.applicable} applicable items completed</span>
        </div>
        {nextSteps.length ? (
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
            {nextSteps.map((e) => (
              <li key={e.item.id}>
                <span className="font-medium">{e.rule.action}</span>
                <span className="text-slate-600"> — {e.decision?.reason ?? findRule(e.rule.id)?.whyGeneric}</span>
                {e.decision?.applicability === "unknown" && <span className="text-amber-800"> (applicability unknown)</span>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-slate-600">{start.revision ? "No open items." : "Your checklist appears after the first confirmed answers."}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <Link href={`/companies/${company.id}/checklist`} className="underline">Open checklist</Link>
          <Link href={`/companies/${company.id}/matters`} className="underline">Contracts & matters</Link>
          <a href={`/api/v1/companies/${company.id}/exports/brief`} target="_blank" rel="noopener" className="underline">Preparation brief</a>
        </div>
      </article>

      {result && result.unknownFactKeys.length > 0 && (
        <article className="rounded border border-amber-200 bg-amber-50 p-4 text-sm">
          <h2 className="font-medium text-amber-900">Open unknowns to raise with an adviser</h2>
          <ul className="mt-2 list-disc pl-5 text-amber-900">{result.unknownFactKeys.map((k) => <li key={k}>{promptFor(k)}</li>)}</ul>
        </article>
      )}

    </section>
  );
}
