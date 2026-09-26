"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Finding } from "@lex/domain";
import { sampleAgreement } from "@/lib/demo-answers";

export interface LatestReview {
  matterId: string;
  title: string;
  mode: "live" | "preparation";
  status: string;
  errorMessage: string | null;
  findings: Finding[];
  questions: string[];
}

async function json(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? "Request failed");
  return data;
}

export function ContractCheck({ companyId, latest, demoMode, modelReady, canEdit, locked }: {
  companyId: string;
  latest: LatestReview | null;
  demoMode: boolean;
  modelReady: boolean;
  canEdit: boolean;
  locked: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [payment, setPayment] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(!latest);

  function useSample() {
    setText(sampleAgreement.text);
    setCounterparty(sampleAgreement.counterparty);
    setPayment(sampleAgreement.intendedPayment);
  }

  async function check() {
    setError(null);
    try {
      setBusy("Saving your deal…");
      const { matter } = await json(`/api/v1/companies/${companyId}/matters`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "supplier",
          title: `Agreement with ${counterparty.trim() || "supplier"}`,
          summary: "Contract check from the company workspace.",
          context: { ...(counterparty.trim() ? { counterparty: counterparty.trim() } : {}), ...(payment.trim() ? { payment: payment.trim() } : {}) },
        }),
      });
      setBusy("Reading the agreement…");
      const form = new FormData();
      form.append("file", new File([text], "agreement.txt", { type: "text/plain" }));
      const { document } = await json(`/api/v1/companies/${companyId}/matters/${matter.id}/documents`, { method: "POST", body: form });
      setBusy("Comparing it with your company…");
      await json(`/api/v1/companies/${companyId}/matters/${matter.id}/analyses`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: document.id, allowExternalProcessing: consent }),
      });
      setShowForm(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not check the agreement");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (locked) return <p className="clex-locked">Save your answers first. The check compares the agreement with your company facts.</p>;

  return (
    <div className="space-y-5">
      {latest && (
        <div className="clex-review">
          <div className="clex-review-head">
            <div>
              <p className="eyebrow">{latest.mode === "live" ? "Model review" : "Local preparation check"} · not legal advice</p>
              <h3>{latest.title}</h3>
            </div>
            <a className="button-primary" href={`/api/v1/companies/${companyId}/matters/${latest.matterId}/export`} target="_blank" rel="noopener">Open lawyer packet ↗</a>
          </div>
          {latest.errorMessage && <p className="clex-alert">{latest.errorMessage}</p>}
          {latest.findings.length > 0 ? (
            <ul className="clex-findings">
              {latest.findings.map((f, i) => (
                <li key={i} className={`is-${f.kind}`}>
                  <strong>{f.title}</strong>
                  <p>{f.explanation}</p>
                  {f.documentExcerpt && <blockquote>“{f.documentExcerpt}”</blockquote>}
                  <p className="clex-finding-why">Why for you: {f.companyReason}</p>
                </li>
              ))}
            </ul>
          ) : !latest.errorMessage && <p className="clex-note">No clause matches were found in the text. See the questions below.</p>}
          {latest.questions.length > 0 && (
            <div className="clex-questions-box">
              <p className="eyebrow">Ask your lawyer</p>
              <ul>{latest.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            <a className="clex-link" href={`/companies/${companyId}/matters/${latest.matterId}`}>Open full matter</a>
            {canEdit && !showForm && <button type="button" className="clex-link" onClick={() => setShowForm(true)}>Check another agreement</button>}
          </div>
        </div>
      )}
      {canEdit && showForm && (
        <div className="clex-contract-form">
          <div className="clex-contract-row">
            <label>
              <span className="clex-field-label">Who is it with?</span>
              <input className="field" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder="e.g. Demo Flour Co" maxLength={200} />
            </label>
            <label>
              <span className="clex-field-label">What did you agree to pay?</span>
              <input className="field" value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="e.g. 30 days after delivery" maxLength={300} />
            </label>
          </div>
          <label className="block">
            <span className="clex-field-label">Paste the agreement</span>
            <textarea className="field font-mono text-sm" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the contract text here." />
          </label>
          {modelReady && (
            <label className="flex gap-2 text-xs text-[var(--color-ink-2)]">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>Send this text and my company details to the configured model provider for review.</span>
            </label>
          )}
          {error && <p role="alert" className="clex-alert">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="button-primary" disabled={!!busy || !text.trim() || (modelReady && !consent)} onClick={() => void check()}>{busy ?? "Check this agreement"}</button>
            {(demoMode || !text) && <button type="button" className="clex-demo-chip" onClick={useSample}><span className="clex-demo-chip-tag">Demo</span>Use sample flour agreement</button>}
          </div>
        </div>
      )}
    </div>
  );
}
