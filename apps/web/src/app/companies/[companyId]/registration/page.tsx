import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { answeredString, uuidSchema } from "@lex/domain";
import { getCompany, listMemberships } from "@lex/db";
import { asActor } from "@/lib/db";
import { parseFounders, parseNames } from "@/lib/registration";
import { loadRegistration } from "@/lib/registration-state";
import { factText } from "@/lib/registration-pack";
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
  const q = demoMode ? "?demo=1" : "";
  const data = await asActor(user.id, async (db) => {
    const company = await getCompany(db, companyId);
    return company ? { company, memberships: await listMemberships(db, companyId), reg: await loadRegistration(db, companyId) } : null;
  });
  if (!data) notFound();
  const { company, reg } = data;
  const revision = reg.start.revision;
  if (!revision) redirect(`/companies/${companyId}/overview${q}`);
  const facts = revision.facts;
  const canEdit = (data.memberships.find((m) => m.userId === user.id && !m.revokedAt)?.role ?? "member") !== "reviewer";
  const prepDone = reg.tasks.slice(1, 5).every((t) => t.done);
  const packTask = reg.tasks.find((t) => t.id === "pack")!;
  const certificateDone = reg.tasks.find((t) => t.id === "certificate")?.done ?? false;
  const registrationComplete = packTask.done && certificateDone;
  const names = parseNames(answeredString(facts, "proposed_names"));
  const founders = parseFounders(answeredString(facts, "founder_details"));

  return (
    <section className="clex-page">
      <nav className="clex-breadcrumb" aria-label="Breadcrumb"><Link href="/">Companies</Link> <span aria-hidden="true">/</span> <Link href={`/companies/${companyId}/overview${q}`}>{company.name}</Link> <span aria-hidden="true">/</span> Pack &amp; certificate</nav>
      <header className="clex-ws-hero">
        <div className="clex-ws-hero-copy">
          <p className="clex-chip-dark">Phase 1 · Registration</p>
          <h1 className="clex-ws-title">Pack &amp; certificate</h1>
          <JourneySteps companyId={companyId} step={registrationComplete ? 4 : 3} completed={[1, ...(prepDone ? [2] : []), ...(registrationComplete ? [3] : [])]} q={q} />
        </div>
      </header>
      <div className="clex-pack-grid">
        <PackDownload companyId={companyId} companyName={company.name} version={revision.version} prepDone={prepDone} packDownloaded={packTask.done} regMatterId={reg.regMatterId} registered={reg.registered} demoMode={demoMode} canEdit={canEdit} />
        <aside className="clex-doc-preview" aria-label="What's inside the pack">
          <div className="clex-doc-sheet">
            <span className="clex-doc-bar" />
            <p className="clex-doc-title">{company.name}: registration pack</p>
            <p className="clex-doc-meta">Profile revision {revision.version} · PDF</p>
            <ol className="clex-doc-toc">
              <li><strong>Registration details</strong><span>{names[0] ?? "Name not set"} · {founders.length} founder{founders.length === 1 ? "" : "s"} · {factText(facts, "legal_form") ?? "form not set"}</span></li>
              <li><strong>Company at a glance</strong><span>{Object.keys(facts).length} confirmed facts</span></li>
              <li><strong>Questions for your lawyer</strong><span>{reg.start.assessment?.result.unknownFactKeys.length ?? 0} “Not sure” answers</span></li>
              <li><strong>After registration</strong><span>Compliance areas to set up</span></li>
            </ol>
            <p className="clex-doc-foot">Preparation material · not legal advice</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
