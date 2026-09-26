"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MatterKind } from "@lex/domain";

const icons: Record<string, string> = { contracts: "✍", hiring: "☺", privacy: "◎", tax: "₦", licences: "✓", governance: "♜", ip: "®" };

export function ModuleCard({ companyId, module: m, existingId, count, canEdit, q, featured }: {
  companyId: string;
  module: { id: string; title: string; kind: MatterKind; blurb: string; accent: string };
  existingId: string | null; count: number; canEdit: boolean; q: string; featured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      <span className="clex-module-icon" aria-hidden="true">{icons[m.id] ?? "•"}</span>
      <span className="clex-module-title">{m.title}</span>
      <span className="clex-module-blurb">{m.blurb}</span>
      <span className="clex-module-foot">{busy ? "Opening…" : count ? `${count} open · Continue →` : "Start →"}</span>
      {featured && <span className="clex-module-tag">Try this</span>}
      {error && <span role="alert" className="clex-module-error">{error}</span>}
    </button>
  );
}
