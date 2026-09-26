"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type Founder, type RegistrationTask, type RegistrationTaskId, demoRegistration, legalFormOptions, serializeFounders } from "@/lib/registration";

type Answer = { state: "answered"; value: string };

export function RegistrationWorkspace({ companyId, version, tasks, initial, demoMode, canEdit, q }: {
  companyId: string;
  version: number;
  tasks: RegistrationTask[];
  initial: { names: string[]; founders: Founder[]; address: string; legalForm: string; activities: string };
  demoMode: boolean;
  canEdit: boolean;
  q: string;
}) {
  const router = useRouter();
  const firstOpen = tasks.find((t) => !t.done && !t.locked)?.id ?? "pack";
  const [active, setActive] = useState<RegistrationTaskId>(firstOpen === "profile" ? "names" : firstOpen);
  const [names, setNames] = useState<string[]>([0, 1, 2].map((i) => initial.names[i] ?? ""));
  const [founders, setFounders] = useState<Founder[]>(initial.founders.length ? initial.founders : [{ name: "", role: "Director", share: "" }]);
  const [address, setAddress] = useState(initial.address);
  const [legalForm, setLegalForm] = useState(initial.legalForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = tasks.filter((t) => t.done).length;
  const current = tasks.find((t) => t.id === active)!;

  async function save(answers: Record<string, Answer>, reason: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/companies/${companyId}/profile`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "if-match": String(version) },
      body: JSON.stringify({ answers, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(((await res.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message ?? "Could not save");
      return;
    }
    router.refresh();
  }
  const a = (value: string): Answer => ({ state: "answered", value });
  const payload: Partial<Record<RegistrationTaskId, () => Record<string, Answer> | null>> = {
    names: () => { const v = names.map((n) => n.trim()).filter(Boolean); return v.length ? { proposed_names: a(v.join("; ").slice(0, 500)) } : null; },
    founders: () => { const v = serializeFounders(founders); return v ? { founder_details: a(v) } : null; },
    address: () => (address.trim() ? { registered_address: a(address.trim().slice(0, 500)) } : null),
    legal_form: () => (legalForm ? { legal_form: a(legalForm) } : null),
  };
  function fillDemo(id: RegistrationTaskId) {
    if (id === "names") setNames(demoRegistration.names);
    if (id === "founders") setFounders(demoRegistration.founders);
    if (id === "address") setAddress(demoRegistration.address);
    if (id === "legal_form") setLegalForm(demoRegistration.legalForm);
  }
  async function saveAllDemo() {
    await save({
      proposed_names: a(demoRegistration.names.join("; ")),
      founder_details: a(serializeFounders(demoRegistration.founders)),
      registered_address: a(demoRegistration.address),
      legal_form: a(demoRegistration.legalForm),
    }, "Registration details (demo answers)");
  }
  const shares = founders.reduce((s, f) => s + (Number(f.share) || 0), 0);

  return (
    <div className="clex-ws-grid">
      <div className="clex-stack">
        {demoMode && canEdit && tasks.slice(1, 5).some((t) => !t.done) && (
          <div className="clex-demo-banner">
            <div><strong>Demo answers are on</strong><p>Each form has a “Use demo answer” tag. Or fill and save all four at once.</p></div>
            <button type="button" className="button-primary" disabled={busy} onClick={() => void saveAllDemo()}>{busy ? "Saving…" : "Fill all demo details →"}</button>
          </div>
        )}
        <section className="clex-panel is-current" aria-live="polite">
          <div className="clex-panel-head">
            <span className={`clex-step-num ${current.done ? "is-done" : ""}`}>{current.done ? "✓" : tasks.indexOf(current) + 1}</span>
            <div><h2>{current.title}</h2><p>{current.hint}</p></div>
          </div>

          {active === "names" && (
            <div className="clex-form">
              {names.map((n, i) => (
                <label key={i}><span className="clex-field-label">{i === 0 ? "First choice" : i === 1 ? "Second choice" : "Third choice"}</span>
                  <input className="field" value={n} maxLength={150} onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} placeholder={i === 0 ? "e.g. Your Company Ltd" : "Optional"} />
                </label>
              ))}
              <p className="clex-fineprint">Registrars usually check that a name isn&apos;t already taken. Your lawyer or agent runs the official search.</p>
            </div>
          )}

          {active === "founders" && (
            <div className="clex-form">
              {founders.map((f, i) => (
                <div key={i} className="clex-founder-row">
                  <input className="field" aria-label={`Founder ${i + 1} name`} placeholder="Full name" value={f.name} onChange={(e) => setFounders(founders.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <input className="field" aria-label={`Founder ${i + 1} role`} placeholder="Role" value={f.role} onChange={(e) => setFounders(founders.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} />
                  <input className="field" aria-label={`Founder ${i + 1} share percent`} placeholder="%" inputMode="decimal" value={f.share} onChange={(e) => setFounders(founders.map((x, j) => (j === i ? { ...x, share: e.target.value.replace(/[^\d.]/g, "") } : x)))} />
                  <button type="button" className="clex-x" aria-label={`Remove founder ${i + 1}`} disabled={founders.length === 1} onClick={() => setFounders(founders.filter((_, j) => j !== i))}>×</button>
                </div>
              ))}
              <div className="clex-row is-between">
                <button type="button" className="button-ghost is-sm" onClick={() => setFounders([...founders, { name: "", role: "Director", share: "" }])}>+ Add founder</button>
                <span className={`clex-share-total ${shares === 100 ? "is-ok" : ""}`}>Shares total {shares}%</span>
              </div>
              <p className="clex-fineprint">Keep ID numbers out of Clex. Your lawyer collects identity documents directly.</p>
            </div>
          )}

          {active === "address" && (
            <div className="clex-form">
              <label><span className="clex-field-label">Registered address</span>
                <textarea className="field" rows={3} maxLength={500} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, city" />
              </label>
              {initial.activities && <p className="clex-fineprint">Activity from your answers: <strong>{initial.activities}</strong></p>}
            </div>
          )}

          {active === "legal_form" && (
            <div className="clex-form">
              <div role="radiogroup" aria-label="Legal form" className="clex-options">
                {legalFormOptions.map((o) => (
                  <label key={o.value} className="clex-option"><input type="radio" name="legal_form" checked={legalForm === o.value} onChange={() => setLegalForm(o.value)} /><span>{o.label}</span></label>
                ))}
              </div>
              <p className="clex-fineprint">Not sure which fits? Pick your best guess. The pack lists it as a question for your lawyer.</p>
            </div>
          )}

          {(active === "pack" || active === "certificate") && (
            <div className="clex-form">
              <p className="clex-muted">{current.locked ? "Finish the four details first: names, founders, address and legal form." : active === "pack" ? "Your details are complete. Download the PDF and take it to your lawyer or registration agent." : "Registered? Upload the certificate and number to unlock the compliance dashboard."}</p>
              {!current.locked && <Link href={`/companies/${companyId}/registration${q}`} className="button-primary is-lg justify-self-start">{active === "pack" ? "Get my registration pack →" : "Upload certificate →"}</Link>}
            </div>
          )}

          {error && <p role="alert" className="clex-alert mt-3">{error}</p>}
          {canEdit && payload[active] && (
            <div className="clex-wizard-nav mt-4">
              {demoMode ? <button type="button" className="clex-demo-chip" onClick={() => fillDemo(active)}><span className="clex-demo-chip-tag">Demo</span>Use demo answer</button> : <span />}
              <button type="button" className="button-primary" disabled={busy || !payload[active]!()} onClick={() => { const p = payload[active]!(); if (p) void save(p, `Registration: ${current.title}`); }}>{busy ? "Saving…" : current.done ? "Update" : "Save and continue →"}</button>
            </div>
          )}
        </section>
        <p className="clex-fineprint">Details are saved as versioned company facts (revision {version}). Nothing here is checked with a registry.</p>
      </div>

      <aside className="clex-side is-ready" aria-label="Registration steps">
        <div className="clex-side-head">
          <div className="clex-ring" style={{ ["--pct" as string]: `${Math.round((done / tasks.length) * 360)}deg` }} aria-hidden="true"><span>{done}/{tasks.length}</span></div>
          <div><p className="eyebrow">Registration</p><p className="clex-side-sub">Steps turn green when you complete them. No manual ticking.</p></div>
        </div>
        <ol className="clex-side-list">
          {tasks.map((t) => (
            <li key={t.id} className={`${t.done ? "is-done" : ""} ${t.id === active ? "is-active" : ""}`}>
              <span className={`clex-circle ${t.done ? "is-done" : ""}`} aria-hidden="true">{t.done && <svg viewBox="0 0 20 20"><path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}</span>
              <div className="clex-side-item">
                {t.id === "profile"
                  ? <Link href={`?edit=1${demoMode ? "&demo=1" : ""}#profile`} className="clex-side-title">{t.title}</Link>
                  : <button type="button" className="clex-side-title" disabled={t.locked} onClick={() => setActive(t.id)} aria-current={t.id === active ? "step" : undefined}>{t.title}</button>}
                <span className="clex-side-state">{t.done ? "Done" : t.locked ? "Locked" : t.id === active ? "In progress" : "To do"}</span>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
