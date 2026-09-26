import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { answeredString, doneStatuses, uuidSchema } from "@lex/domain";
import { getCompany } from "@lex/db";
import { buildChecklistView } from "@/lib/checklist-view";
import { loadCompanyStart } from "@/lib/company-start";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { JourneySteps } from "@/components/journey-steps";
import { PackDownload } from "@/components/pack-download";

export const dynamic = "force-dynamic";

export default async function RegistrationPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<{ demo?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/");
  const { companyId } = await params;
  if (!uuidSchema.safeParse(companyId).success) notFound();
  const demoMode = (await searchParams).demo === "1";
  const data = await asActor(user.id, async (db) => {
    const company = await getCompany(db, companyId);
    return company ? { company, start: await loadCompanyStart(db, companyId) } : null;
  });
  if (!data) notFound();
  const { company, start } = data;
  const q = demoMode ? "?demo=1" : "";
  if (!start.revision) redirect(`/companies/${companyId}/overview${q}`);
  const view = buildChecklistView(start, start.pack);
  const entries = view.entries.filter((e) => e.item.status !== "dismissed_with_reason");
  const done = entries.filter((e) => doneStatuses.includes(e.item.status)).length;
  const registered = answeredString(start.revision.facts, "registration_status") === "registered";

  return (
    <section className="clex-page">
      <nav className="clex-breadcrumb" aria-label="Breadcrumb"><Link href="/">Companies</Link> <span aria-hidden="true">/</span> <Link href={`/companies/${companyId}/overview${q}`}>{company.name}</Link> <span aria-hidden="true">/</span> Registration pack</nav>
      <header className="clex-ws-hero is-compact">
        <div className="clex-ws-hero-copy">
          <p className="clex-chip-dark">Step 3</p>
          <h1 className="clex-ws-title">Your registration pack</h1>
          <JourneySteps companyId={companyId} step={registered ? 4 : 3} q={q} />
        </div>
      </header>
      <div className="clex-pack-grid">
        <PackDownload companyId={companyId} companyName={company.name} version={start.revision.version} doneCount={done} total={entries.length} registered={registered} demoMode={demoMode} />
        <aside className="clex-doc-preview" aria-label="What's inside">
          <div className="clex-doc-sheet">
            <span className="clex-doc-bar" />
            <p className="clex-doc-title">{company.name}: registration pack</p>
            <p className="clex-doc-meta">Profile revision {start.revision.version} · PDF</p>
            <ol className="clex-doc-toc">
              <li><strong>Company at a glance</strong><span>{Object.keys(start.revision.facts).length} confirmed facts</span></li>
              <li><strong>Registration checklist</strong><span>{done} of {entries.length} done</span></li>
              <li><strong>Questions for your lawyer</strong><span>{(start.assessment?.result.unknownFactKeys.length ?? 0) + (entries.length - done)} open</span></li>
              <li><strong>Official starting points</strong><span>{new Set(entries.flatMap((e) => e.sources.map((s) => s.id))).size} links</span></li>
            </ol>
            <p className="clex-doc-foot">Preparation material · not legal advice</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
