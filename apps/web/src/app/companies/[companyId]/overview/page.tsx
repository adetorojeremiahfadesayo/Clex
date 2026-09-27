import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { answeredString, uuidSchema } from "@lex/domain";
import { getCompany, listMemberships } from "@lex/db";
import { asActor } from "@/lib/db";
import { parseFounders, parseNames } from "@/lib/registration";
import { loadRegistration } from "@/lib/registration-state";
import { currentUser } from "@/lib/session";
import { Clexa } from "@/components/clexa";
import { IntakeForm } from "@/components/intake-form";
import { JourneySteps } from "@/components/journey-steps";
import { RegistrationWorkspace } from "@/components/registration-workspace";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<{ demo?: string; edit?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/");
  const { companyId } = await params;
  if (!uuidSchema.safeParse(companyId).success) notFound();
  const query = await searchParams;
  const demoMode = query.demo === "1";
  const q = demoMode ? "?demo=1" : "";
  const data = await asActor(user.id, async (db) => {
    const company = await getCompany(db, companyId);
    if (!company) return null;
    return { company, memberships: await listMemberships(db, companyId), reg: await loadRegistration(db, companyId) };
  });
  if (!data) notFound();
  const { company, reg } = data;
  const { start, tasks } = reg;
  // Registered companies live in the compliance phase.
  if (reg.registered && query.edit !== "1") redirect(`/companies/${companyId}/run${q}`);
  const canEdit = (data.memberships.find((m) => m.userId === user.id && !m.revokedAt)?.role ?? "member") !== "reviewer";
  const facts = start.revision?.facts ?? {};
  const editing = canEdit && (!start.revision || query.edit === "1");
  const prepDone = tasks.slice(1, 5).every((t) => t.done);
  const step = !start.revision ? 1 : !prepDone ? 2 : 3;
  const tip = !start.revision
    ? demoMode ? "Fill this page with demo answers, read them, then tap Next. Repeat for each page." : "Tell me about the business, one screen at a time. “Not sure” is a fine answer."
    : !prepDone ? "Now the registration details. Each step turns green when you save it." : "All details in. Download your registration pack for your lawyer.";

  return (
    <section className="clex-page">
      <nav className="clex-breadcrumb" aria-label="Breadcrumb"><Link href="/">Companies</Link> <span aria-hidden="true">/</span> {company.name}</nav>
      <header className="clex-ws-hero">
        <div className="clex-ws-hero-copy">
          <p className="clex-chip-dark">Phase 1 · Registration</p>
          <h1 className="clex-ws-title">{company.name}</h1>
          <JourneySteps companyId={companyId} step={step} q={q} />
        </div>
        <div className="clex-ws-guide">
          <p className="clex-bubble" role="status">{tip}</p>
          <Clexa className="clex-ws-mascot" />
        </div>
      </header>

      {editing ? (
        <div className="clex-ws-grid">
          <section id="profile" className="clex-panel is-current">
            <div className="clex-panel-head"><span className="clex-step-num">1</span><div><h2>About your business</h2><p>Your answers shape the registration pack and the compliance areas that follow.</p></div></div>
            <IntakeForm key={start.revision?.version ?? 0} companyId={companyId} currentVersion={start.revision?.version ?? 0} facts={facts} demoMode={demoMode} />
          </section>
          <aside className="clex-side" aria-label="Registration steps">
            <div className="clex-side-head"><div><p className="eyebrow">Registration</p><p className="clex-side-sub">Your steps, turning green as you go.</p></div></div>
            <ol className="clex-side-list">{tasks.map((t) => <li key={t.id} className={t.done ? "is-done" : ""}><span className={`clex-circle ${t.done ? "is-done" : ""}`} aria-hidden="true" /><div className="clex-side-item"><span className="clex-side-title">{t.title}</span><span className="clex-side-state">{t.done ? "Done" : t.id === "profile" ? "In progress" : "To do"}</span></div></li>)}</ol>
          </aside>
        </div>
      ) : (
        <RegistrationWorkspace
          key={start.revision?.version ?? 0}
          companyId={companyId}
          version={start.revision?.version ?? 0}
          tasks={tasks}
          initial={{
            names: parseNames(answeredString(facts, "proposed_names")),
            founders: parseFounders(answeredString(facts, "founder_details")),
            address: answeredString(facts, "registered_address") ?? "",
            legalForm: facts.legal_form?.value.state === "answered" ? String(facts.legal_form.value.value) : "",
            activities: answeredString(facts, "activities") ?? "",
          }}
          demoMode={demoMode}
          canEdit={canEdit}
          q={q}
        />
      )}
    </section>
  );
}
