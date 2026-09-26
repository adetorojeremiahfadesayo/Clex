"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type ChecklistStatus, doneStatuses } from "@lex/domain";

export interface SidebarItem {
  id: string;
  version: number;
  status: ChecklistStatus;
  action: string;
  why: string;
  unknown: boolean;
  gather: string[];
  sources: { id: string; title: string; url: string }[];
}

// Shortest founder-allowed path to "done" from each open status.
const pathToDone: Partial<Record<ChecklistStatus, ChecklistStatus[]>> = {
  suggested: ["accepted", "in_progress", "user_completed"],
  accepted: ["in_progress", "user_completed"],
  in_progress: ["user_completed"],
  evidence_submitted: ["user_completed"],
  blocked: ["in_progress", "user_completed"],
};

export function ChecklistSidebar({ companyId, items, canEdit, hasProfile, notice }: {
  companyId: string;
  items: SidebarItem[];
  canEdit: boolean;
  hasProfile: boolean;
  notice: string;
}) {
  const router = useRouter();
  const [local, setLocal] = useState<Record<string, { status: ChecklistStatus; version: number }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const view = items.map((i) => ({ ...i, ...local[i.id] }));
  const done = view.filter((i) => doneStatuses.includes(i.status)).length;
  const pct = view.length ? done / view.length : 0;

  async function patch(id: string, to: ChecklistStatus, version: number, evidence?: string) {
    const res = await fetch(`/api/v1/checklist-items/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to, expectedVersion: version, ...(evidence ? { evidence } : {}) }),
    });
    const data = (await res.json().catch(() => null)) as { item?: { status: ChecklistStatus; version: number }; error?: { message?: string } } | null;
    if (!res.ok || !data?.item) throw new Error(data?.error?.message ?? "Could not update");
    return data.item;
  }

  async function toggle(item: (typeof view)[number]) {
    setBusy(item.id);
    setError(null);
    try {
      let current = { status: item.status, version: item.version };
      if (doneStatuses.includes(item.status)) {
        current = await patch(item.id, "in_progress", current.version);
      } else {
        for (const to of pathToDone[item.status] ?? []) {
          // The tap itself is the founder's confirmation; it is recorded as such, not as verified evidence.
          current = await patch(item.id, to, current.version, to === "user_completed" ? "Marked done by the founder from the checklist." : undefined);
        }
      }
      setLocal((l) => ({ ...l, [item.id]: current }));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <aside className={`clex-side ${hasProfile ? "is-ready" : ""}`} aria-label="Your checklist">
      <div className="clex-side-head">
        <div className="clex-ring" style={{ ["--pct" as string]: `${Math.round(pct * 360)}deg` }} aria-hidden="true"><span>{done}/{view.length}</span></div>
        <div>
          <p className="eyebrow">Your checklist</p>
          <p className="clex-side-sub">{!hasProfile ? "Appears after you save your answers." : done === view.length && view.length ? "All steps done. Nice work." : "Tap a circle when a step is done."}</p>
        </div>
      </div>
      {!hasProfile ? (
        <ul className="clex-side-list is-ghost" aria-hidden="true">{[0, 1, 2, 3].map((i) => <li key={i}><span className="clex-circle" /><span className="clex-ghost-line" /></li>)}</ul>
      ) : (
        <ul className="clex-side-list">
          {view.map((item) => {
            const isDone = doneStatuses.includes(item.status);
            const canToggle = canEdit && item.status !== "reviewer_verified" && (isDone || !!pathToDone[item.status]);
            return (
              <li key={item.id} className={isDone ? "is-done" : ""}>
                <button type="button" className={`clex-circle ${isDone ? "is-done" : ""} ${busy === item.id ? "is-busy" : ""}`} disabled={!canToggle || !!busy} onClick={() => void toggle(item)} aria-label={isDone ? `Mark "${item.action}" not done` : `Mark "${item.action}" done`} aria-pressed={isDone}>
                  {isDone && <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </button>
                <div className="clex-side-item">
                  <button type="button" className="clex-side-title" aria-expanded={openId === item.id} onClick={() => setOpenId(openId === item.id ? null : item.id)}>{item.action}</button>
                  {item.unknown && !isDone && <span className="clex-side-flag">Depends on a “Not sure” answer</span>}
                  {openId === item.id && (
                    <div className="clex-side-detail">
                      <p>{item.why}</p>
                      {item.gather.length > 0 && <p><strong>Have ready:</strong> {item.gather.join(", ")}</p>}
                      {item.sources.map((s) => <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a>)}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p role="alert" className="clex-alert mt-3">{error}</p>}
      {hasProfile && (
        <div className="clex-side-foot">
          <a href={`/api/v1/companies/${companyId}/exports/brief`} target="_blank" rel="noopener">Preparation brief ↗</a>
          <Link href={`/companies/${companyId}/checklist`}>Skip, block or add evidence</Link>
          <p>{notice}</p>
        </div>
      )}
    </aside>
  );
}
