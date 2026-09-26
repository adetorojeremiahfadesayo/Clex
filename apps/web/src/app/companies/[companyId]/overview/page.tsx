import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { type FactKey, answeredString, doneStatuses, factState, intakeProgress, intakeQuestions, lifecycleStageLabels, uuidSchema } from "@lex/domain";
import { getCompany, listMatterAnalyses, listMatters, listMemberships } from "@lex/db";
import { buildChecklistView } from "@/lib/checklist-view";
import { loadCompanyStart } from "@/lib/company-start";
import { asActor } from "@/lib/db";
import { env } from "@/lib/env";
import { currentUser } from "@/lib/session";
import { Clexa } from "@/components/clexa";
import { IntakeForm } from "@/components/intake-form";
import { ProfileStep } from "@/components/profile-step";
import { ChecklistSidebar, type SidebarItem } from "@/components/checklist-sidebar";
import { ContractCheck, type LatestReview } from "@/components/contract-check";

export const dynamic = "force-dynamic";

const summaryKeys: { key: FactKey; label: string }[] = [
  { key: "formation_country", label: "Formed in" },
  { key: "formation_subdivision", label: "Region" },
  { key: "legal_form", label: "Legal form" },
  { key: "registration_status", label: "Registration" },
  { key: "industry", label: "Industry" },
  { key: "customer_type", label: "Customers" },
  { key: "employee_count", label: "Employees" },
  { key: "regulated_activity", label: "Licence needed" },
];

function factLabel(facts: Parameters<typeof answeredString>[0], key: FactKey): string | null {
  const state = factState(facts, key);
  if (state === "unknown") return "Not sure";
  const raw = answeredString(facts, key);
  if (!raw) return null;
  return intakeQuestions.find((q) => q.key === key)?.options?.find((o) => o.value === raw)?.label ?? raw;
}

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
    const memberships = await listMemberships(db, companyId);
    const matters = (await listMatters(db, companyId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
    let latest: LatestReview | null = null;
    for (const m of matters) {
      const analysis = (await listMatterAnalyses(db, companyId, m.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (analysis) {
        latest = { matterId: m.id, title: m.title, mode: analysis.mode, status: analysis.status, errorMessage: analysis.errorMessage, findings: analysis.findings, questions: analysis.questions };
        break;
      }
    }
    return { company, memberships, latest, start: await loadCompanyStart(db, companyId) };
  });
  if (!data) notFound();
  const { company, start, latest } = data;
  const role = data.memberships.find((m) => m.userId === user.id && !m.revokedAt)?.role ?? "member";
  const canEdit = role !== "reviewer";
  const config = env();
  const modelReady = config.LLM_PROVIDER !== "none" && !!config.LLM_API_KEY && !!config.LLM_MODEL;
  const facts = start.revision?.facts ?? {};
  const hasProfile = !!start.revision;
  const progress = intakeProgress(facts);
  const view = buildChecklistView(start, start.pack);
  const items: SidebarItem[] = view.entries.filter((e) => e.item.status !== "dismissed_with_reason").map((e) => ({
    id: e.item.id,
    version: e.item.version,
    status: e.item.status,
    action: e.rule.action,
    why: e.decision?.reason ?? e.rule.whyGeneric,
    unknown: e.decision?.applicability === "unknown",
    gather: e.rule.gather,
    sources: e.sources.map((s) => ({ id: s.id, title: s.title, url: s.url })),
  }));
  const doneCount = items.filter((i) => doneStatuses.includes(i.status)).length;
  const summary = summaryKeys.map(({ key, label }) => ({ label, value: factLabel(facts, key) })).filter((f): f is { label: string; value: string } => !!f.value);
  const step = !hasProfile ? 1 : !latest ? 2 : 3;
  const tip = !hasProfile
    ? demoMode ? "Tap the gold demo answers, or “Pick all demo answers”, then save. It takes about 20 seconds." : "Tell me about the business. “Not sure” is a perfectly good answer; I’ll flag it rather than guess."
    : !latest
      ? `Your checklist is ready: ${items.length} steps on the right. Tap a circle when one is done. Next, let’s check a contract.`
      : `Done. ${latest.findings.length} point${latest.findings.length === 1 ? "" : "s"} to raise and a lawyer packet ready. ${doneCount}/${items.length} checklist steps ticked.`;

  return (
    <section className="space-y-6">
      <nav className="clex-breadcrumb" aria-label="Breadcrumb"><Link href="/">Companies</Link> <span aria-hidden="true">/</span> {company.name}</nav>

      <header className="clex-ws-hero">
        <div className="clex-ws-hero-copy">
          <p className="clex-hero-kicker">{lifecycleStageLabels[company.lifecycleStage]}</p>
          <h1 className="clex-ws-title">{company.name}</h1>
          <ol className="clex-stepper" aria-label="Progress">
            {["Answer questions", "Tick checklist", "Check a contract"].map((label, i) => (
              <li key={label} className={i + 1 < step ? "is-done" : i + 1 === step ? "is-current" : ""}><span>{i + 1 < step ? "✓" : i + 1}</span>{label}</li>
            ))}
          </ol>
        </div>
        <div className="clex-ws-guide">
          <p className="clex-bubble" role="status">{tip}</p>
          <Clexa className="clex-ws-mascot" />
        </div>
      </header>

      {start.packStale && <p role="status" className="clex-alert">The content pack behind this checklist is now {start.pack?.version.status.replace(/_/g, " ")}. Re-save your answers to refresh it.</p>}
      {view.stale && hasProfile && <p role="status" className="clex-note">Your answers changed after this checklist was built. <Link className="clex-link" href={`/companies/${companyId}/checklist`}>Regenerate it</Link>.</p>}

      <div className="clex-ws-grid">
        <div className="space-y-6 min-w-0">
          <section id="profile" className={`clex-step-card ${step === 1 ? "is-current" : "is-done"}`}>
            <div className="clex-step-head">
              <span className="clex-step-num">{hasProfile ? "✓" : "1"}</span>
              <div>
                <h2>About your business</h2>
                <p>{hasProfile ? `${progress.answered} of ${progress.applicable} answered · ${progress.unknown} Not sure · revision ${start.revision?.version}` : "Your answers shape the checklist. Nothing is treated as legally verified."}</p>
              </div>
            </div>
            {canEdit ? (
              <ProfileStep key={start.revision?.version ?? 0} summary={summary} startOpen={!hasProfile || query.edit === "1"}>
                <IntakeForm key={start.revision?.version ?? 0} companyId={companyId} currentVersion={start.revision?.version ?? 0} facts={facts} demoMode={demoMode} />
              </ProfileStep>
            ) : (
              <ul className="clex-fact-chips">{summary.map((f) => <li key={f.label}><span>{f.label}</span>{f.value}</li>)}</ul>
            )}
          </section>

          <section id="contract" className={`clex-step-card ${step === 2 ? "is-current" : step === 3 ? "is-done" : "is-upcoming"}`}>
            <div className="clex-step-head">
              <span className="clex-step-num">{latest ? "✓" : "2"}</span>
              <div>
                <h2>Check a contract</h2>
                <p>Paste an agreement. Clex points out where it differs from your deal and gives you questions for your lawyer.</p>
              </div>
            </div>
            <ContractCheck key={latest?.matterId ?? "none"} companyId={companyId} latest={latest} demoMode={demoMode} modelReady={modelReady} canEdit={canEdit} locked={!hasProfile} />
          </section>

          <p className="clex-privacy">Hiring or another question? <Link className="clex-link" href={`/companies/${companyId}/matters`}>Open all matters</Link>. {view.contentNotice}</p>
        </div>

        <ChecklistSidebar key={start.assessment?.id ?? "none"} companyId={companyId} items={items} canEdit={canEdit} hasProfile={hasProfile} notice="Checklist steps are preparation prompts from synthetic starter rules, not reviewed legal advice." />
      </div>
    </section>
  );
}
