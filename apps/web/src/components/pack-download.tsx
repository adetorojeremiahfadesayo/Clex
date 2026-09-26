"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Confetti } from "./confetti";

export function PackDownload({ companyId, companyName, version, doneCount, total, registered, demoMode }: {
  companyId: string; companyName: string; version: number; doneCount: number; total: number; registered: boolean; demoMode: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fire, setFire] = useState(0);
  const [regNumber, setRegNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const q = demoMode ? "?demo=1" : "";

  async function download() {
    setState("loading");
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
      setState("done");
      setFire((f) => f + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not build the pack");
      setState("idle");
    }
  }

  async function markRegistered() {
    setSaving(true);
    setError(null);
    const answers: Record<string, unknown> = { registration_status: { state: "answered", value: "registered" } };
    if (regNumber.trim()) answers.registration_number = { state: "answered", value: regNumber.trim() };
    const res = await fetch(`/api/v1/companies/${companyId}/profile`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "if-match": String(version) },
      body: JSON.stringify({ answers, reason: "Founder confirmed registration" }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(((await res.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message ?? "Could not save");
      return;
    }
    router.push(`/companies/${companyId}/run${q}`);
  }

  if (state !== "done") {
    return (
      <div className="clex-panel is-current">
        <p className="eyebrow">Ready to download</p>
        <h2 className="clex-h2">One PDF your lawyer can work from</h2>
        <p className="clex-muted mt-2">Your confirmed facts, the registration checklist ({doneCount} of {total} done), the questions you still need answered, and official links. Everything in one place.</p>
        {doneCount < total && <p className="clex-note mt-4">{total - doneCount} step{total - doneCount === 1 ? " is" : "s are"} still open. They&apos;ll appear in the pack as open questions.</p>}
        {error && <p role="alert" className="clex-alert mt-4">{error}</p>}
        <div className="clex-actions mt-6">
          <button type="button" className="button-primary is-lg" onClick={() => void download()} disabled={state === "loading"}>{state === "loading" ? "Building your PDF…" : "Download registration pack (PDF)"}</button>
          <Link href={`/companies/${companyId}/overview${q}`} className="button-ghost">← Back to checklist</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="clex-panel is-success">
      <Confetti fire={fire} />
      <div className="clex-success-badge" aria-hidden="true">✓</div>
      <h2 className="clex-h2">Pack downloaded!</h2>
      <p className="clex-muted mt-2">Take it to your lawyer or registration agent. <button type="button" className="clex-link" onClick={() => void download()}>Download again</button></p>
      <div className="clex-next-card">
        <p className="eyebrow">Next: run your company</p>
        {registered ? (
          <Link href={`/companies/${companyId}/run${q}`} className="button-primary is-lg mt-3">Go to Run your company →</Link>
        ) : (
          <>
            <p className="clex-muted">Once you&apos;re registered, tell Clex. Contracts, hiring, data and filings open up in one place.</p>
            <label className="mt-4 block">
              <span className="clex-field-label">Registration number (optional)</span>
              <input className="field" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} maxLength={80} placeholder={demoMode ? "e.g. RC-DEMO-0001 (demo)" : "As shown on your certificate"} />
            </label>
            {error && <p role="alert" className="clex-alert mt-3">{error}</p>}
            <div className="clex-actions mt-4">
              <button type="button" className="button-primary is-lg" onClick={() => void markRegistered()} disabled={saving}>{saving ? "Saving…" : "I’m registered: run my company →"}</button>
              <Link href={`/companies/${companyId}/run${q}`} className="button-ghost">Not yet, just look around</Link>
            </div>
            <p className="clex-fineprint mt-3">This records your own confirmation. Clex doesn&apos;t check it with any registry.</p>
          </>
        )}
      </div>
    </div>
  );
}
