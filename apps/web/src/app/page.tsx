import Link from "next/link";
import { redirect } from "next/navigation";
import { lifecycleStageLabels } from "@lex/domain";
import { listCompanies } from "@lex/db";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { StartDemoButton } from "@/components/start-demo-button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/");
  const companies = await asActor(user.id, (db) => listCompanies(db));

  return (
    <section className="space-y-8">
      <div className="rounded-2xl bg-[#183b50] px-6 py-8 text-white sm:px-9 sm:py-10">
        <span className="text-xs font-semibold uppercase tracking-[.16em] text-blue-200">A legal workspace that learns your business</span>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-5"><div><h1 className="max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">Start well. Keep your company ready.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">Confirm your company profile, see starting tasks, then prepare contracts and questions with the context your lawyer needs.</p><p className="mt-2 text-xs text-blue-100">Short on time? The demo loads synthetic company facts, a sample agreement, findings and a working draft into your own browser workspace.</p></div><div className="flex flex-wrap items-center gap-3"><StartDemoButton /><Link href="/companies/new" className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#183b50]">Add a company →</Link></div></div>
      </div>
      <div><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold">Your companies</h2><span className="text-sm text-slate-500">{companies.length} workspaces</span></div>
      {companies.length === 0 ? (
        <p className="card border-dashed p-6 text-slate-600">
          You have no companies yet. Add one to build a confirmed profile and tailored starting checklist.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {companies.map((c) => (
            <li key={c.id} className="card p-5">
              <Link href={`/companies/${c.id}/overview`} className="text-lg font-semibold underline-offset-2 hover:underline">
                {c.name}
              </Link>
              <p className="mt-1 text-sm text-slate-600">{lifecycleStageLabels[c.lifecycleStage]}</p><Link href={`/companies/${c.id}/matters`} className="mt-4 inline-block text-sm font-medium text-[var(--accent)] underline">Open contracts & matters →</Link>
            </li>
          ))}
        </ul>
      )}</div>
      <p className="text-xs text-slate-500">Each browser gets a private workspace automatically. Keep this browser’s cookies to retain access; this preview does not offer account recovery.</p>
    </section>
  );
}
