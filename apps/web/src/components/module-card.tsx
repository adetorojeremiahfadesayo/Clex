"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MatterKind } from "@lex/domain";

const icons: Record<string, string> = { contracts: "✍", hiring: "☺", privacy: "◎", tax: "₦", licences: "✓", governance: "♜", ip: "®" };

export function ModuleCard({ companyId, module: m, existingId, status, statusLabel, tasks, note, canEdit, q, featured }: {
  companyId: string;
  module: { id: string; title: string; kind: MatterKind; blurb: string; accent: string };
  existingId: string | null; status: string; statusLabel: string; tasks: { label: string; done: boolean }[];
  note: string | null; canEdit: boolean; q: string; featured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = tasks.filter((t) => t.done).length;
  async function open() {
    if (existingId) { router.push(`/companies/${companyId}/matters/${existingId}${q}`); return; }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/companies/${companyId}/matters`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: m.kind, title: m.title, summary: m.blurb, context: { topic: m.id } }),
    });
    const data = (await res.json().catch(() => null)) as { matter?: { id: string }; error?: { message?: string } } | null;
    if (!res.ok || !data?.matter) { setBusy(false); setError(data?.error?.message ?? "Could not open"); return; }
    router.push(`/companies/${companyId}/matters/${data.matter.id}${q}`);
  }
  return (
    <button type="button" className={`clex-module is-${m.accent} ${featured ? "is-featured" : ""}`} onClick={() => void open()} disabled={busy || (!existingId && !canEdit)}>
      <span className="clex-module-top">
        <span className="clex-module-icon" aria-hidden="true">{icons[m.id] ?? "•"}</span>
        <span className={`clex-status is-${status}`}>{statusLabel}</span>
      </span>
      <span className="clex-module-title">{m.title}</span>
      <span className="clex-module-blurb">{m.blurb}</span>
      {note && <span className={`clex-module-note ${status === "needs_attention" ? "is-alert" : ""}`}>{note}</span>}
      <span className="clex-module-tasks">
        {tasks.map((t) => <span key={t.label} className={t.done ? "is-done" : ""}><i aria-hidden="true" />{t.label}</span>)}
      </span>
      <span className="clex-module-foot"><span className="clex-mini-bar"><span style={{ width: `${(done / tasks.length) * 100}%` }} /></span>{busy ? "Opening…" : `${done}/${tasks.length} · ${existingId ? "Continue →" : "Start →"}`}</span>
      {featured && <span className="clex-module-tag">Next</span>}
      {error && <span role="alert" className="clex-module-error">{error}</span>}
    </button>
  );
}
