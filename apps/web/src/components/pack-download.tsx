"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { demoRegistration } from "@/lib/registration";
import { Confetti } from "./confetti";

async function json(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? "Request failed");
  return data;
}

export function PackDownload({ companyId, companyName, version, prepDone, packDownloaded, regMatterId, registered, demoMode, canEdit }: {
  companyId: string; companyName: string; version: number; prepDone: boolean; packDownloaded: boolean;
  regMatterId: string | null; registered: boolean; demoMode: boolean; canEdit: boolean;
}) {
  const router = useRouter();
  const [downloaded, setDownloaded] = useState(packDownloaded);
  const [loading, setLoading] = useState(false);
  const [fire, setFire] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [regNumber, setRegNumber] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const q = demoMode ? "?demo=1" : "";

  async function download() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/companies/${companyId}/exports/registration-pack`);
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message ?? "Could not build the pack");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${companyName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-registration-pack-v${version}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setDownloaded(true);
      setFire((f) => f + 1);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not build the pack");
    } finally {
      setLoading(false);
    }
  }

  async function submitCertificate() {
    if (!file) return;
    setError(null);
    try {
      setSaving("Saving certificate…");
      let matterId = regMatterId;
      if (!matterId) {
        const { matter } = await json(`/api/v1/companies/${companyId}/matters`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "other", title: "Company registration", summary: "Registration certificate and records.", context: { topic: "registration" } }) });
        matterId = matter.id as string;
      }
      const form = new FormData();
      form.append("file", file);
      await json(`/api/v1/companies/${companyId}/matters/${matterId}/documents`, { method: "POST", body: form });
      setSaving("Recording registration…");
      const answers: Record<string, unknown> = { registration_status: { state: "answered", value: "registered" } };
      if (regNumber.trim()) answers.registration_number = { state: "answered", value: regNumber.trim() };
      answers.registration_evidence = { state: "answered", value: `Certificate uploaded to Clex: ${file.name}` };
      await json(`/api/v1/companies/${companyId}/profile`, { method: "PATCH", headers: { "content-type": "application/json", "if-match": String(version) }, body: JSON.stringify({ answers, reason: "Founder uploaded registration certificate" }) });
      setDone(true);
      setFire((f) => f + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save");
    } finally {
      setSaving(null);
    }
  }

  if (!prepDone) {
    return (
      <div className="clex-panel">
        <h2 className="clex-h2">Almost there</h2>
        <p className="clex-muted mt-2">Finish your registration details (names, founders, address, legal form) and the pack unlocks.</p>
        <Link href={`/companies/${companyId}/overview${q}`} className="button-primary is-lg mt-4">← Back to registration details</Link>
      </div>
    );
  }

  if (done || registered) {
    return (
      <div className="clex-panel is-success">
        <Confetti fire={fire} />
        <div className="clex-success-badge" aria-hidden="true">✓</div>
        <h2 className="clex-h2">You&apos;re registered!</h2>
        <p className="clex-muted mt-2">Phase 1 is done. Next is keeping the company compliant: contracts, hiring, data, tax, licences, board and IP, all in one dashboard.</p>
        <button type="button" className="button-primary is-lg mt-5" onClick={() => router.push(`/companies/${companyId}/run${q}`)}>Open compliance dashboard →</button>
      </div>
    );
  }

  return (
    <div className="clex-stack">
      {!downloaded ? (
        <div className="clex-panel is-current">
          <p className="eyebrow">Step 6 of 7</p>
          <h2 className="clex-h2">One PDF your lawyer can work from</h2>
          <p className="clex-muted mt-2">Your company facts, registration details (names, founders and shares, address, legal form), questions still open, and official links.</p>
          {error && <p role="alert" className="clex-alert mt-4">{error}</p>}
          <div className="clex-actions mt-6">
            <button type="button" className="button-primary is-lg" onClick={() => void download()} disabled={loading}>{loading ? "Building your PDF…" : "Download registration pack (PDF)"}</button>
            <Link href={`/companies/${companyId}/overview${q}`} className="button-ghost">← Registration details</Link>
          </div>
        </div>
      ) : (
        <div className="clex-panel is-success">
          <Confetti fire={fire} />
          <div className="clex-success-badge" aria-hidden="true">✓</div>
          <h2 className="clex-h2">Pack downloaded!</h2>
          <p className="clex-muted mt-2">Take it to your lawyer or registration agent. <button type="button" className="clex-link" onClick={() => void download()}>Download again</button></p>
        </div>
      )}

      {downloaded && canEdit && (
        <div className="clex-panel is-current">
          <p className="eyebrow">Step 7 of 7 · when you&apos;re registered</p>
          <h2 className="clex-h3 mt-1">Upload your certificate</h2>
          <p className="clex-muted mt-1">Adding the certificate completes registration and opens the compliance dashboard.</p>
          <div className="clex-form mt-4">
            <label className="clex-drop">{file ? `Selected: ${file.name}` : "Choose certificate (PDF, DOCX or TXT)"}<input type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
            <label><span className="clex-field-label">Registration number</span><input className="field" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} maxLength={80} placeholder="As shown on the certificate" /></label>
            {error && <p role="alert" className="clex-alert">{error}</p>}
            <div className="clex-row">
              <button type="button" className="button-primary is-lg" disabled={!file || !!saving} onClick={() => void submitCertificate()}>{saving ?? "Complete registration →"}</button>
              {demoMode && <button type="button" className="clex-demo-chip" onClick={() => { setFile(new File([demoRegistration.certificate], "certificate-demo.txt", { type: "text/plain" })); setRegNumber(demoRegistration.registrationNumber); }}><span className="clex-demo-chip-tag">Demo</span>Use sample certificate</button>}
            </div>
            <p className="clex-fineprint">This records your own confirmation. Clex doesn&apos;t verify it with any registry.</p>
          </div>
        </div>
      )}
    </div>
  );
}
