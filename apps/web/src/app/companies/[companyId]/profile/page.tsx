import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { type IntakeGroup, intakeGroupLabels, intakeProgress, intakeViews, uuidSchema } from "@lex/domain";
import { getCompany, listRevisions } from "@lex/db";
import { IntakeForm, type IntakeQuestionView } from "@/components/intake-form";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ companyId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { companyId } = await params;
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

  return (
    <section className="space-y-6">
      <nav className="text-sm text-slate-600" aria-label="Breadcrumb">
        <Link href="/" className="underline">Companies</Link> /{" "}
        <Link href={`/companies/${companyId}/overview`} className="underline">{data.company.name}</Link> / Profile
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Company profile</h1>
          <p className="text-sm text-slate-600">
            {progress.answered} of {progress.applicable} applicable questions addressed · {progress.unknown} marked Not sure · revision {current?.version ?? 0}
          </p>
        </div>
        <Link href={`/companies/${companyId}/checklist`} className="text-sm underline">Go to checklist</Link>
      </div>
      <p className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
        Questions adapt to your earlier answers. <strong>Not sure</strong> keeps a fact unknown instead of guessing; <strong>Skip</strong> leaves it for later. Every save is a new versioned revision you can review below.
      </p>
      <IntakeForm companyId={companyId} currentVersion={current?.version ?? 0} groups={groups} />
      <details className="rounded border border-slate-200 bg-white p-4">
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
