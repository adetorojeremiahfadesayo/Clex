import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { type FactKey, answeredString, doneStatuses, intakeProgress, lifecycleStageLabels, uuidSchema } from "@lex/domain";
import { getCompany, listMemberships } from "@lex/db";
import { buildChecklistView } from "@/lib/checklist-view";
import { loadCompanyStart } from "@/lib/company-start";
import { asActor } from "@/lib/db";
import { factText } from "@/lib/registration-pack";
import { currentUser } from "@/lib/session";
import { Clexa } from "@/components/clexa";
import { IntakeForm } from "@/components/intake-form";
import { ChecklistSidebar, type SidebarItem } from "@/components/checklist-sidebar";
import { JourneySteps } from "@/components/journey-steps";

export const dynamic = "force-dynamic";

const summaryKeys: { key: FactKey; label: string }[] = [
  { key: "formation_country", label: "Formed in" },
  { key: "formation_subdivision", label: "Region" },
  { key: "legal_form", label: "Legal form" },
  { key: "registration_status", label: "Registration" },
  { key: "industry", label: "Industry" },
  { key: "employee_count", label: "Employees" },
  { key: "regulated_activity", label: "Licence needed" },
];

export default async function WorkspacePage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<{ demo?: string; edit?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/");
  const { companyId } = await params;
  if (!uuidSchema.safeParse(companyId).success) notFound();
  const query = await searchParams;
  const demoMode = query.demo === "1";
  const data = await asActor(user.id, async (db) => {
    const company = await getCompany(db, companyId);
    if (!company) return null;
    return { company, memberships: await listMemberships(db, companyId), start: await loadCompanyStart(db, companyId) };
  });
  if (!data) notFound();
  const { company, start } = data;
  const role = data.memberships.find((m) => m.userId === user.id && !m.revokedAt)?.role ?? "member";
  const canEdit = role !== "reviewer";
  const facts = start.revision?.facts ?? {};
  const hasProfile = !!start.revision;
  const editing = canEdit && (!hasProfile || query.edit === "1");
  const registered = answeredString(facts, "registration_status") === "registered";
  const progress = intakeProgress(facts);
  const view = buildChecklistView(start, start.pack);
  const items: SidebarItem[] = view.entries.filter((e) => e.item.status !== "dismissed_with_reason").map((e) => ({
    id: e.item.id, version: e.item.version, status: e.item.status, action: e.rule.action,
    why: e.decision?.reason ?? e.rule.whyGeneric, unknown: e.decision?.applicability === "unknown",
    gather: e.rule.gather, sources: e.sources.map((s) => ({ id: s.id, title: s.title, url: s.url })),
  }));
  const doneCount = items.filter((i) => doneStatuses.includes(i.status)).length;
  const allDone = items.length > 0 && doneCount === items.length;
  const summary = summaryKeys.map(({ key, label }) => ({ label, value: factText(facts, key) })).filter((f): f is { label: string; value: string } => !!f.value);
  const step = !hasProfile ? 1 : registered ? 4 : allDone ? 3 : 2;
  const q = demoMode ? "?demo=1" : "";
  const tip = !hasProfile
    ? demoMode ? "Tap “Pick all demo answers”, then save. About 20 seconds." : "Tell me about the business, one screen at a time. “Not sure” is a fine answer."
    : allDone ? "Checklist complete! Grab your registration pack for your lawyer." : `Tick each circle in your checklist as you finish a step. ${doneCount} of ${items.length} done.`;

  return (
    <section className="clex-page">
      <nav className="clex-breadcrumb" aria-label="Breadcrumb"><Link href="/">Companies</Link> <span aria-hidden="true">/</span> {company.name}</nav>

      <header className="clex-ws-hero">
        <div className="clex-ws-hero-copy">
          <p className="clex-chip-dark">{registered ? "Registered" : lifecycleStageLabels[company.lifecycleStage]}</p>
          <h1 className="clex-ws-title">{company.name}</h1>
          <JourneySteps companyId={companyId} step={step} q={q} />
        </div>
        <div className="clex-ws-guide">
          <p className="clex-bubble" role="status">{tip}</p>
          <Clexa className="clex-ws-mascot" />
        </div>
      </header>

      {start.packStale && <p role="status" className="clex-alert">The content pack behind this checklist is now {start.pack?.version.status.replace(/_/g, " ")}. Re-save your answers to refresh it.</p>}
      {view.stale && hasProfile && <p role="status" className="clex-note">Your answers changed after this checklist was built. <Link className="clex-link" href={`/companies/${companyId}/checklist`}>Regenerate it</Link>.</p>}

      <div className="clex-ws-grid">
        <div className="clex-stack">
          {editing ? (
            <section id="profile" className="clex-panel is-current">
              <div className="clex-panel-head"><span className="clex-step-num">1</span><div><h2>About your business</h2><p>Your answers shape the checklist. Nothing is treated as legally verified.</p></div></div>
              <IntakeForm key={start.revision?.version ?? 0} companyId={companyId} currentVersion={start.revision?.version ?? 0} facts={facts} demoMode={demoMode} />
            </section>
          ) : (
            <>
              <section className={`clex-panel ${allDone ? "is-current" : ""}`}>
                <div className="clex-panel-head"><span className="clex-step-num">{allDone ? "3" : "2"}</span><div>
                  <h2>{allDone ? "Your registration pack is ready" : "Work through your checklist"}</h2>
                  <p>{allDone ? "Download a PDF with your facts, checklist, open questions and official links, ready to hand to a lawyer or registration agent." : "Each checklist step comes from your answers. Tap a circle when it's done. You can download your pack at any time; open steps are listed as open."}</p>
                </div></div>
                <div className="clex-meter"><div><strong>{doneCount}</strong> of {items.length} steps done</div><div className="clex-progress is-thick"><span style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} /></div></div>
                <div className="clex-actions">
                  <Link href={`/companies/${companyId}/registration${q}`} className={allDone ? "button-primary is-lg" : "button-secondary is-lg"}>Get my registration pack →</Link>
                  <Link href={`/companies/${companyId}/run${q}`} className="button-ghost">Already registered? Run your company →</Link>
                </div>
              </section>

              <section className="clex-panel is-quiet">
                <div className="clex-panel-head"><span className="clex-step-num is-done">✓</span><div><h2>About your business</h2><p>{progress.answered} of {progress.applicable} answered · {progress.unknown} Not sure · revision {start.revision?.version}</p></div></div>
                <ul className="clex-fact-chips">{summary.map((f) => <li key={f.label}><span>{f.label}</span>{f.value}</li>)}</ul>
                {canEdit && <Link href={`?edit=1${demoMode ? "&demo=1" : ""}#profile`} className="clex-link mt-4 inline-block">Edit answers</Link>}
              </section>
            </>
          )}
          <p className="clex-fineprint">{view.contentNotice}</p>
        </div>

        <ChecklistSidebar key={start.assessment?.id ?? "none"} companyId={companyId} items={items} canEdit={canEdit} hasProfile={hasProfile} notice="Checklist steps are preparation prompts from synthetic starter rules, not reviewed legal advice." />
      </div>
    </section>
  );
}
