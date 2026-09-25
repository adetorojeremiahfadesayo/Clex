"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PackStatus, PlatformRole } from "@lex/domain";

export function PackActions({ versionId, status, isAuthor, role, cases }: { versionId: string; status: PackStatus; isAuthor: boolean; role: PlatformRole; cases: unknown[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function call(path: string, body: unknown) {
    setPending(true);
    setMsg(null);
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as { error?: { message?: string }; report?: { passed: number; total: number; failures: unknown[]; uncoveredRuleIds: string[] } } | null;
    setPending(false);
    if (!res.ok) {
      setMsg({ kind: "err", text: data?.error?.message ?? "Request failed" });
      return;
    }
    if (data?.report) setMsg({ kind: data.report.failures.length ? "err" : "ok", text: `Evaluation: ${data.report.passed}/${data.report.total} cases pass; ${data.report.failures.length} failures; uncovered rules: ${data.report.uncoveredRuleIds.length}` });
    router.refresh();
  }
  const transition = (to: PackStatus, reason?: string) => call(`/api/v1/content/pack-versions/${versionId}/transition`, { to, reason });
  const reviewer = role === "content_reviewer";
  const btn = "rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {cases.length > 0 && (status === "draft" || status === "under_review") && (
          <button type="button" disabled={pending} className={btn} onClick={() => call(`/api/v1/content/pack-versions/${versionId}/evaluate`, { cases })}>
            Run {cases.length} reviewer cases
          </button>
        )}
        {status === "draft" && <button type="button" disabled={pending} className={btn} onClick={() => transition("under_review")}>Submit for review</button>}
        {status === "under_review" && <button type="button" disabled={pending} className={btn} onClick={() => transition("draft", "returned by reviewer")}>Return to draft</button>}
        {status === "under_review" && reviewer && (
          <button type="button" disabled={pending || isAuthor} title={isAuthor ? "Authors cannot publish their own version" : undefined} className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" onClick={() => transition("published")}>
            Publish
          </button>
        )}
        {status === "published" && reviewer && <button type="button" disabled={pending} className={btn} onClick={() => transition("stale", "marked stale by reviewer")}>Mark stale</button>}
        {status !== "withdrawn" && reviewer && <button type="button" disabled={pending} className={`${btn} text-red-800`} onClick={() => transition("withdrawn", "withdrawn by reviewer")}>Withdraw</button>}
      </div>
      {msg && <p role={msg.kind === "err" ? "alert" : "status"} className={`rounded border px-3 py-2 text-sm ${msg.kind === "err" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{msg.text}</p>}
    </div>
  );
}
