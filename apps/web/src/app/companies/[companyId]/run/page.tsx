import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { answeredString, uuidSchema } from "@lex/domain";
import { getCompany, listChecklist, listMatterAnalyses, listMatterDocuments, listMatterDrafts, listMatters, listMemberships } from "@lex/db";
import { type ModuleStatus, complianceCalendar, complianceScore, moduleViews, statusLabels } from "@/lib/compliance";
import { asActor } from "@/lib/db";
import { companyModules } from "@/lib/modules";
import { loadRegistration } from "@/lib/registration-state";
import { currentUser } from "@/lib/session";
import { JourneySteps } from "@/components/journey-steps";
import { ModuleCard } from "@/components/module-card";
import { Clexa } from "@/components/clexa";

export const dynamic = "force-dynamic";

export default async function CompliancePage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<{ demo?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/");
  const { companyId } = await params;
  if (!uuidSchema.safeParse(companyId).success) notFound();
  const demoMode = (await searchParams).demo === "1";
  const q = demoMode ? "?demo=1" : "";
  const data = await asActor(user.id, async (db) => {
    const company = await getCompany(db, companyId);
    if (!company) return null;
    const matters = (await listMatters(db, companyId)).filter((m) => companyModules.some((x) => x.id === m.context.topic));
    const moduleData = await Promise.all(matters.map(async (matter) => ({
      matter,
      documents: await listMatterDocuments(db, companyId, matter.id),
      analyses: await listMatterAnalyses(db, companyId, matter.id),
      drafts: await listMatterDrafts(db, companyId, matter.id),
    })));
    return { company, moduleData, checklist: await listChecklist(db, companyId), reg: await loadRegistration(db, companyId), memberships: await listMemberships(db, companyId) };
  });
  if (!data) notFound();
  const { company, reg } = data;
  const facts = reg.start.revision?.facts ?? {};
  const canEdit = (data.memberships.find((m) => m.userId === user.id && !m.revokedAt)?.role ?? "member") !== "reviewer";
  const views = moduleViews(data.moduleData, data.checklist);
  const score = complianceScore(views);
  const counts = (s: ModuleStatus) => views.filter((v) => v.status === s).length;
  const calendar = complianceCalendar(facts, data.moduleData);
  const attention = views.filter((v) => v.status === "needs_attention");
  const next = attention[0] ?? views.find((v) => v.recommended && v.status === "not_started") ?? views.find((v) => v.status !== "in_order");
  const regNumber = answeredString(facts, "registration_number");
  const tip = !reg.registered
    ? "You haven't finished registration yet. You can look around, but start with Phase 1."
    : attention.length ? `${attention[0]!.module.title} needs attention. Open it and draft a response.` : next ? `Next up: ${next.module.title}. ${demoMode && next.module.id === "contracts" ? "Add the sample Slack chat and contract, then ask me to check it." : ""}` : "All tracked tasks are complete. Review them with your adviser.";

  return (
    <section className="clex-page">
      <nav className="clex-breadcrumb" aria-label="Breadcrumb"><Link href="/">Companies</Link> <span aria-hidden="true">/</span> {company.name}</nav>
      <header className="clex-ws-hero">
        <div className="clex-ws-hero-copy">
          <p className="clex-chip-dark">Phase 2 · Compliance{reg.registered ? ` · Registered${regNumber ? ` ${regNumber}` : ""}` : ""}</p>
          <h1 className="clex-ws-title">Keep {company.name} on track</h1>
          <JourneySteps companyId={companyId} step={4} q={q} />
        </div>
        <div className="clex-ws-guide">
          <p className="clex-bubble">{tip}</p>
          <Clexa className="clex-ws-mascot" />
        </div>
      </header>

      {!reg.registered && <p className="clex-note">Registration isn&apos;t complete. <Link className="clex-link" href={`/companies/${companyId}/overview${q}`}>Finish Phase 1</Link> to unlock the calendar dates.</p>}

      <div className="clex-health">
        <div className="clex-health-score">
          <div className="clex-ring is-lg" style={{ ["--pct" as string]: `${Math.round(score * 3.6)}deg` }}><span>{score}%</span></div>
          <div><p className="eyebrow">Task progress</p><p className="clex-muted">Share of tracked tasks completed across all areas; this is not a legal compliance score.</p></div>
        </div>
        <ul className="clex-health-stats">
          <li className="is-in_order"><strong>{counts("in_order")}</strong>In order</li>
          <li className="is-needs_attention"><strong>{counts("needs_attention")}</strong>Needs attention</li>
          <li className="is-in_progress"><strong>{counts("in_progress")}</strong>In progress</li>
          <li className="is-not_started"><strong>{counts("not_started")}</strong>Not started</li>
        </ul>
      </div>

      <div className="clex-ws-grid">
        <ul className="clex-module-grid">
          {views.map((v) => (
            <li key={v.module.id}>
              <ModuleCard
                companyId={companyId}
                module={{ id: v.module.id, title: v.module.title, kind: v.module.kind, blurb: v.module.blurb, accent: v.module.accent }}
                existingId={v.matterId}
                status={v.status}
                statusLabel={statusLabels[v.status]}
                tasks={v.tasks}
                note={v.attention ?? (v.recommended && v.status === "not_started" ? `From your answers: ${v.recommended}` : null)}
                canEdit={canEdit}
                q={q}
                featured={next?.module.id === v.module.id}
              />
            </li>
          ))}
        </ul>
        <aside className="clex-side is-calendar" aria-label="Compliance calendar">
          <div className="clex-side-head"><div><p className="eyebrow">Compliance calendar</p><p className="clex-side-sub">Placeholder dates from your registration date. Confirm real deadlines with your adviser.</p></div></div>
          <ol className="clex-cal">
            {calendar.map((e, i) => {
              const mod = companyModules.find((m) => m.id === e.moduleId);
              const d = e.date ? new Date(`${e.date}T00:00:00Z`) : null;
              return (
                <li key={i} className={`is-${mod?.accent ?? "slate"}`}>
                  <span className="clex-cal-date">{d ? <><b>{d.toLocaleDateString("en-GB", { day: "2-digit", timeZone: "UTC" })}</b>{d.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" })}</> : <b>•</b>}</span>
                  <span className="clex-cal-body"><strong>{e.title}</strong><em>{mod?.title ?? "General"} · {e.source}</em></span>
                </li>
              );
            })}
          </ol>
          <p className="clex-side-foot-note">Dates are planning placeholders, not legal deadlines. Clex has no reviewed filing rules for your market yet.</p>
        </aside>
      </div>
      <p className="clex-fineprint">Recommendations and drafts are preparation for a qualified adviser, not legal advice. Registration records: <Link className="clex-link" href={`/companies/${companyId}/registration${q}`}>pack &amp; certificate</Link>.</p>
    </section>
  );
}
