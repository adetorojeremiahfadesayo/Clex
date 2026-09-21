import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { lifecycleStageLabels, uuidSchema } from "@lex/domain";
import { getCompany, listMemberships } from "@lex/db";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OverviewPage({ params }: { params: Promise<{ companyId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { companyId } = await params;
  if (!uuidSchema.safeParse(companyId).success) notFound();
  const data = await asActor(user.id, async (db) => {
    const company = await getCompany(db, companyId);
    return company ? { company, memberships: await listMemberships(db, companyId) } : null;
  });
  if (!data) notFound();
  const { company, memberships } = data;
  const myRole = memberships.find((m) => m.userId === user.id)?.role ?? "member";

  return (
    <section className="space-y-6">
      <nav className="text-sm text-slate-600" aria-label="Breadcrumb">
        <Link href="/" className="underline">Companies</Link> / {company.name}
      </nav>
      <div>
        <h1 className="text-2xl font-semibold">{company.name}</h1>
        <p className="text-slate-600">{lifecycleStageLabels[company.lifecycleStage]} · your role: {myRole}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded border border-slate-200 bg-white p-4">
          <h2 className="font-medium">Current position</h2>
          <p className="mt-2 text-sm text-slate-600">
            The company profile, assessment and starting checklist arrive in the next milestone. Until then, this
            company only has its name and stage recorded.
          </p>
        </article>
        <article className="rounded border border-slate-200 bg-white p-4">
          <h2 className="font-medium">Background jobs</h2>
          <p className="mt-2 text-sm text-slate-600">
            Long-running work is queued and processed by a separate worker so results survive refreshes.
          </p>
          <Link href={`/companies/${company.id}/jobs`} className="mt-3 inline-block text-sm underline">
            View jobs
          </Link>
        </article>
      </div>

      <article className="rounded border border-slate-200 bg-white p-4">
        <h2 className="font-medium">Members</h2>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {memberships.map((m) => (
            <li key={m.id} className="flex justify-between py-2">
              <span>{m.userId === user.id ? `${user.displayName} (you)` : m.userId}</span>
              <span className="text-slate-600">{m.role}{m.revokedAt ? " · revoked" : ""}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
