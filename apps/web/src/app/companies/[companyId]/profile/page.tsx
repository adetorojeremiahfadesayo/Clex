import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { type IntakeGroup, intakeGroupLabels, intakeProgress, intakeViews, uuidSchema } from "@lex/domain";
import { getCompany, listRevisions } from "@lex/db";
import { IntakeForm, type IntakeQuestionView } from "@/components/intake-form";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<{ demo?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/");
  const { companyId } = await params;
  const demoMode = (await searchParams).demo === "1";
  if (!uuidSchema.safeParse(companyId).success) notFound();
  const data = await asActor(user.id, async (db) => {
    const company = await getCompany(db, companyId);
    return company ? { company, history: await listRevisions(db, companyId) } : null;
  });
  if (!data) notFound();
  const current = data.history[0];
  const facts = current?.facts ?? {};
  const views = intakeViews(facts);
  const progress = intakeProgress(facts);
  const groups = (Object.keys(intakeGroupLabels) as IntakeGroup[])
    .map((group) => ({
      group,
      label: intakeGroupLabels[group],
      questions: views
        .filter((v) => v.question.group === group)
        .map<IntakeQuestionView>((v) => ({
          key: v.question.key,
          group,
          prompt: v.prompt,
          help: v.question.help,
          kind: v.question.kind,
          options: v.question.options,
          allowUnknown: v.question.allowUnknown,
          allowSkip: v.question.allowSkip,
          state: v.state,
          current: v.current,
        })),
    }))
    .filter((g) => g.questions.length > 0);
  const percent = progress.applicable ? Math.round((progress.answered / progress.applicable) * 100) : 0;

  return (
    <section className="space-y-6">
      <nav className="clex-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Companies</Link> <span aria-hidden="true">/</span>{" "}
        <Link href={`/companies/${companyId}/overview`}>{data.company.name}</Link> <span aria-hidden="true">/</span> Profile
      </nav>
      <div className="clex-page-head">
        <div>
          <p className="eyebrow">Step 1 · Tell Clex about the business</p>
          <h1 className="clex-page-title">Company profile</h1>
          <p className="clex-page-sub">
            {progress.answered} of {progress.applicable} applicable questions addressed · {progress.unknown} marked Not sure · revision {current?.version ?? 0}
          </p>
          <div className="clex-progress" role="progressbar" aria-label="Questions addressed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></div>
        </div>
        <div className="clex-page-actions">
          {!demoMode && <Link href="?demo=1" className="button-secondary">Click demo answers</Link>}
          <Link href={`/companies/${companyId}/checklist`} className="button-secondary">Go to checklist →</Link>
        </div>
      </div>
      <p className="clex-note">
        Questions adapt to your earlier answers. <strong>Not sure</strong> keeps a fact unknown instead of guessing; <strong>Skip</strong> leaves it for later. Every save is a new versioned revision you can review below.
      </p>
      <IntakeForm key={current?.version ?? 0} companyId={companyId} currentVersion={current?.version ?? 0} groups={groups} demoMode={demoMode} />
      <details className="card p-5">
        <summary className="cursor-pointer font-medium">Revision history ({data.history.length})</summary>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {data.history.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>v{r.version} · {r.reason} · {Object.keys(r.facts).length} facts</span>
              <span className="text-slate-500">{new Date(r.createdAt).toISOString().replace("T", " ").slice(0, 16)} UTC</span>
            </li>
          ))}
          {data.history.length === 0 && <li className="py-2 text-slate-500">No revisions yet.</li>}
        </ul>
      </details>
    </section>
  );
}
