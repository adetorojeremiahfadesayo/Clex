import Link from "next/link";
import { redirect } from "next/navigation";
import { lifecycleStageLabels } from "@lex/domain";
import { listCompanies } from "@lex/db";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const companies = await asActor(user.id, (db) => listCompanies(db));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Your companies</h1>
        <Link href="/companies/new" className="rounded bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white">
          Add a company
        </Link>
      </div>
      {companies.length === 0 ? (
        <p className="rounded border border-dashed border-slate-300 bg-white p-6 text-slate-600">
          You have no companies yet. Add one to begin building its confirmed profile.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {companies.map((c) => (
            <li key={c.id} className="rounded border border-slate-200 bg-white p-4">
              <Link href={`/companies/${c.id}/overview`} className="font-medium underline-offset-2 hover:underline">
                {c.name}
              </Link>
              <p className="mt-1 text-sm text-slate-600">{lifecycleStageLabels[c.lifecycleStage]}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
