import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { answeredString, uuidSchema } from "@lex/domain";
import { getCompany, getCurrentRevision, listMatters, listMemberships } from "@lex/db";
import { asActor } from "@/lib/db";
import { companyModules } from "@/lib/modules";
import { currentUser } from "@/lib/session";
import { JourneySteps } from "@/components/journey-steps";
import { ModuleCard } from "@/components/module-card";
import { Clexa } from "@/components/clexa";

export const dynamic = "force-dynamic";

export default async function RunPage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<{ demo?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/");
  const { companyId } = await params;
  if (!uuidSchema.safeParse(companyId).success) notFound();
  const demoMode = (await searchParams).demo === "1";
  const data = await asActor(user.id, async (db) => {
    const company = await getCompany(db, companyId);
    if (!company) return null;
    return { company, matters: await listMatters(db, companyId), revision: await getCurrentRevision(db, companyId), memberships: await listMemberships(db, companyId) };
  });
  if (!data) notFound();
  const q = demoMode ? "?demo=1" : "";
  const registered = answeredString(data.revision?.facts ?? {}, "registration_status") === "registered";
  const canEdit = (data.memberships.find((m) => m.userId === user.id && !m.revokedAt)?.role ?? "member") !== "reviewer";

  return (
    <section className="clex-page">
      <nav className="clex-breadcrumb" aria-label="Breadcrumb"><Link href="/">Companies</Link> <span aria-hidden="true">/</span> <Link href={`/companies/${companyId}/overview${q}`}>{data.company.name}</Link> <span aria-hidden="true">/</span> Run your company</nav>
      <header className="clex-ws-hero">
        <div className="clex-ws-hero-copy">
          <p className="clex-chip-dark">{registered ? "Registered ✓" : "Registration in progress"}</p>
          <h1 className="clex-ws-title">Run your company</h1>
          <p className="clex-hero-lede">Pick an area. Add a document or a Slack or Gmail conversation, and the Clex agent gives you recommendations and drafts you can edit.</p>
          <JourneySteps companyId={companyId} step={4} q={q} />
        </div>
        <div className="clex-ws-guide">
          <p className="clex-bubble">{demoMode ? "Try Contracts & suppliers: I'll catch where the contract doesn't match your Slack chat." : "Start with whatever's on your desk today."}</p>
          <Clexa className="clex-ws-mascot" />
        </div>
      </header>
      <ul className="clex-module-grid">
        {companyModules.map((m) => {
          const mine = data.matters.filter((x) => x.context.topic === m.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          return <li key={m.id}><ModuleCard companyId={companyId} module={{ id: m.id, title: m.title, kind: m.kind, blurb: m.blurb, accent: m.accent }} existingId={mine[0]?.id ?? null} count={mine.length} canEdit={canEdit} q={q} featured={demoMode && m.id === "contracts"} /></li>;
        })}
      </ul>
      <p className="clex-fineprint">Every recommendation and draft is preparation for a qualified adviser, not legal advice. <Link className="clex-link" href={`/companies/${companyId}/matters`}>All matters</Link></p>
    </section>
  );
}
