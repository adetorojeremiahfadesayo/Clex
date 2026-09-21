"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type ChecklistStatus, type MembershipRole, checklistStatusLabels, checklistTransitions } from "@lex/domain";

export interface ChecklistCardData {
  id: string;
  version: number;
  status: ChecklistStatus;
  evidence: string | null;
  reason: string | null;
  action: string;
  why: string;
  applicability: "yes" | "no" | "unknown" | undefined;
  gather: string[];
  missingPrompts: string[];
  sources: { id: string; authority: string; title: string; url: string; checkedAt: string }[];
  ruleVersion: string;
}

const badge: Record<ChecklistStatus, string> = {
  suggested: "bg-slate-100 text-slate-700",
  accepted: "bg-blue-50 text-blue-800",
  in_progress: "bg-blue-50 text-blue-800",
  evidence_submitted: "bg-violet-50 text-violet-800",
  user_completed: "bg-emerald-50 text-emerald-800",
  reviewer_verified: "bg-emerald-100 text-emerald-900",
  dismissed_with_reason: "bg-slate-100 text-slate-500",
  blocked: "bg-red-50 text-red-800",
  superseded: "bg-slate-100 text-slate-500",
};

export function ChecklistItemCard({ data, role }: { data: ChecklistCardData; role: MembershipRole }) {
  const router = useRouter();
  const [open, setOpen] = useState<ChecklistStatus | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const options = checklistTransitions[data.status].filter((t) => t.roles.includes(role));

  async function submit(to: ChecklistStatus, requires: "evidence" | "reason" | undefined) {
    setPending(true);
    setError(null);
    const body: Record<string, unknown> = { to, expectedVersion: data.version };
    if (requires === "evidence") body.evidence = text;
    if (requires === "reason") body.reason = text;
    const res = await fetch(`/api/v1/checklist-items/${data.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setPending(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(d?.error?.message ?? "Could not update");
      return;
    }
    setOpen(null);
    setText("");
    router.refresh();
  }

  return (
    <li className="rounded border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-medium">{data.action}</h3>
        <span className={`rounded px-2 py-0.5 text-xs ${badge[data.status]}`}>{checklistStatusLabels[data.status]}</span>
      </div>
      <p className="mt-2 text-sm text-slate-700">
        <span className="font-medium">Why for your company: </span>
        {data.why}
      </p>
      {data.applicability === "unknown" && (
        <p className="mt-1 text-sm text-amber-800">Applicability unknown — this stays a question, not an assumption.</p>
      )}
      {data.missingPrompts.length > 0 && (
        <p className="mt-1 text-sm text-slate-600">Still needed: {data.missingPrompts.join("; ")}</p>
      )}
      {data.gather.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-slate-700">Information to gather</summary>
          <ul className="ml-5 mt-1 list-disc text-slate-600">{data.gather.map((g) => <li key={g}>{g}</li>)}</ul>
        </details>
      )}
      {data.sources.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {data.sources.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.authority}: {s.title}</a>
              <span className="text-slate-500"> · official directory, checked {s.checkedAt} · research pointer, not reviewed content</span>
            </li>
          ))}
        </ul>
      )}
      {data.evidence && <p className="mt-2 text-sm"><span className="font-medium">Evidence you recorded:</span> {data.evidence}</p>}
      {data.reason && (data.status === "dismissed_with_reason" || data.status === "blocked") && (
        <p className="mt-2 text-sm"><span className="font-medium">Reason:</span> {data.reason}</p>
      )}
      <p className="mt-2 text-xs text-slate-500">Rule {data.ruleVersion} (synthetic) · item version {data.version}</p>
      {options.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((t) => (
            <button
              key={t.to}
              type="button"
              disabled={pending}
              onClick={() => (t.requires ? setOpen(open === t.to ? null : t.to) : submit(t.to, undefined))}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {t.to === "reviewer_verified" ? "Verify as reviewer" : `Mark ${checklistStatusLabels[t.to].toLowerCase()}`}
            </button>
          ))}
        </div>
      )}
      {open && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(open, checklistTransitions[data.status].find((t) => t.to === open)?.requires);
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium">
              {open === "dismissed_with_reason" || open === "blocked" ? "Reason" : "Evidence (what you did, document held, reference number)"}
            </span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} required rows={2} className="w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <button type="submit" disabled={pending} className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            Confirm
          </button>
        </form>
      )}
      {error && <p role="alert" className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
    </li>
  );
}
