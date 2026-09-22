import Link from "next/link";
import { redirect } from "next/navigation";
import { marketLabels } from "@lex/domain";
import { getPlatformRole, listPacks, listSources } from "@lex/db";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const data = await asActor(user.id, async (db) => ({ role: await getPlatformRole(db, user.id), packs: await listPacks(db), sources: await listSources(db) }));
  const editorial = data.role !== "none";

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Legal content packs</h1>
        <p className="text-sm text-slate-600">
          Your platform role: <strong>{data.role.replace(/_/g, " ")}</strong>. {editorial ? "You can see drafts and run the review workflow." : "You can see published and stale packs only."}
        </p>
      </div>
      <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        A pack is legal content only once a content reviewer (not its author) publishes it after a passing evaluation of the exact content hash. Draft and under-review packs are never used for company assessments.
      </p>
      <ul className="space-y-3">
        {data.packs.map((p) => (
          <li key={p.id} className="rounded border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-medium">{p.title}</h2>
              <span className="text-sm text-slate-600">{marketLabels[p.market]} · {p.slug}</span>
            </div>
            {p.versions.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No versions visible to you.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {p.versions.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/content/packs/${v.id}`} className="underline">v{v.version}</Link>
                    <span className={`rounded px-2 py-0.5 text-xs ${v.status === "published" ? "bg-emerald-50 text-emerald-800" : v.status === "under_review" ? "bg-blue-50 text-blue-800" : v.status === "draft" ? "bg-slate-100 text-slate-700" : "bg-red-50 text-red-800"}`}>{v.status.replace(/_/g, " ")}</span>
                    <span className="text-slate-500">{v.content.rules.length} rules · {v.content.capabilities.map((c) => c.replace(/_/g, " ")).join(", ")} · hash {v.contentHash.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
        {data.packs.length === 0 && <li className="rounded border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No packs yet.</li>}
      </ul>
      <details className="rounded border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-medium">Source registry ({data.sources.length})</summary>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {data.sources.map((s) => (
            <li key={s.id} className="py-2">
              <span className="font-medium">{s.authority}</span> — {s.title} <span className="text-slate-500">({marketLabels[s.market]}, {s.kind.replace(/_/g, " ")})</span>
              <ul className="ml-4 mt-1 text-slate-600">
                {s.versions.map((v) => (
                  <li key={v.id}>v{v.version} · <a href={v.url} className="underline" target="_blank" rel="noopener noreferrer">{v.url}</a> · checked {v.checked_at} · {v.review_state}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
