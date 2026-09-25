import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { marketLabels, uuidSchema } from "@lex/domain";
import { draftPackManifests } from "@lex/content";
import { getPackVersion, getPlatformRole, listEvaluations, listPacks } from "@lex/db";
import { PackActions } from "@/components/pack-actions";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PackVersionPage({ params }: { params: Promise<{ versionId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/");
  const { versionId } = await params;
  if (!uuidSchema.safeParse(versionId).success) notFound();
  const data = await asActor(user.id, async (db) => {
    const version = await getPackVersion(db, versionId);
    if (!version) return null;
    const role = await getPlatformRole(db, user.id);
    const pack = (await listPacks(db)).find((p) => p.id === version.packId)!;
    return { version, role, pack, evaluations: role === "none" ? [] : await listEvaluations(db, versionId) };
  });
  if (!data) notFound();
  const { version: v, role, pack } = data;
  const cases = draftPackManifests.find((m) => m.slug === pack.slug)?.cases ?? [];
  const c = v.content;

  return (
    <section className="space-y-6">
      <nav className="text-sm text-slate-600" aria-label="Breadcrumb"><Link href="/content" className="underline">Content packs</Link> / {pack.slug} v{v.version}</nav>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{pack.title} — v{v.version}</h1>
          <p className="text-sm text-slate-600">{marketLabels[pack.market]} · status <strong>{v.status.replace(/_/g, " ")}</strong>{v.statusReason ? ` (${v.statusReason})` : ""} · hash {v.contentHash.slice(0, 16)}</p>
          <p className="text-xs text-slate-500">Author {v.authorId === user.id ? "you" : v.authorId.slice(0, 8)} · reviewer {v.reviewerId ? (v.reviewerId === user.id ? "you" : v.reviewerId.slice(0, 8)) : "none"} · published {v.publishedAt?.slice(0, 10) ?? "no"}</p>
        </div>
        {role !== "none" && <PackActions versionId={v.id} status={v.status} isAuthor={v.authorId === user.id} role={role} cases={cases} />}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded border border-slate-200 bg-white p-4 text-sm">
          <h2 className="font-medium">Scope</h2>
          <dl className="mt-2 space-y-1">
            <div><dt className="inline text-slate-600">Matter types: </dt><dd className="inline">{c.matterTypes.join(", ")}</dd></div>
            <div><dt className="inline text-slate-600">Subdivisions: </dt><dd className="inline">{c.subdivisions.length ? c.subdivisions.join(", ") : "all (not subdivision-specific)"}</dd></div>
            <div><dt className="inline text-slate-600">Capabilities: </dt><dd className="inline">{c.capabilities.map((x) => x.replace(/_/g, " ")).join(", ")}</dd></div>
            <div><dt className="inline text-slate-600">Excluded topics: </dt><dd className="inline">{c.excludedTopics.join("; ") || "none listed"}</dd></div>
            <div><dt className="inline text-slate-600">Review due: </dt><dd className="inline">{c.reviewDueAt ?? "not set"}</dd></div>
          </dl>
          {c.notes && <p className="mt-2 text-slate-600">{c.notes}</p>}
        </article>
        <article className="rounded border border-slate-200 bg-white p-4 text-sm">
          <h2 className="font-medium">Evaluations ({data.evaluations.length})</h2>
          {data.evaluations.length === 0 ? (
            <p className="mt-2 text-slate-600">{role === "none" ? "Visible to content roles only." : "None run for this version yet. Publication requires a passing run on the current hash."}</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {data.evaluations.map((e) => (
                <li key={e.id} className="py-1">
                  <span className={e.passed === e.total ? "text-emerald-800" : "text-red-800"}>{e.passed}/{e.total}</span> · hash {e.content_hash.slice(0, 10)}{e.content_hash !== v.contentHash && <span className="text-amber-800"> (older content)</span>} · {e.run_at.toISOString().slice(0, 16).replace("T", " ")} UTC
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="rounded border border-slate-200 bg-white p-4 text-sm">
        <h2 className="font-medium">Rules ({c.rules.length})</h2>
        <ul className="mt-2 space-y-3">
          {c.rules.map((r) => (
            <li key={r.id} className="border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
              <p className="font-medium">{r.action} <span className="font-normal text-slate-500">· {r.id} · priority {r.priority}</span></p>
              <p className="text-slate-600">Applies when: {r.applies.map((p) => `${p.fact} ${p.op}${p.value !== undefined ? ` ${JSON.stringify(p.value)}` : ""}`).join(" and ")}</p>
              <p className="text-slate-600">Sources: {r.sourceSlugs.join(", ")}</p>
            </li>
          ))}
        </ul>
      </article>

      <article className="rounded border border-slate-200 bg-white p-4 text-sm">
        <h2 className="font-medium">Sources cited ({c.sourceRefs.length})</h2>
        <ul className="mt-2 list-disc pl-5 text-slate-700">{c.sourceRefs.map((s) => <li key={s.slug}>{s.slug}{s.versionId ? ` (version ${s.versionId.slice(0, 8)})` : " (no pinned version)"}</li>)}</ul>
      </article>
    </section>
  );
}
