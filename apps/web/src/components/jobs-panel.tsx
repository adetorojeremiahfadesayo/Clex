"use client";

import { useEffect, useState } from "react";
import type { Job } from "@lex/domain";

const statusStyles: Record<Job["status"], string> = {
  queued: "bg-amber-50 text-amber-800 border-amber-200",
  running: "bg-blue-50 text-blue-800 border-blue-200",
  succeeded: "bg-emerald-50 text-emerald-800 border-emerald-200",
  failed: "bg-red-50 text-red-800 border-red-200",
  cancelled: "bg-slate-100 text-slate-700 border-slate-200",
};

export function JobsPanel({ companyId, initialJobs }: { companyId: string; initialJobs: Job[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/v1/companies/${companyId}/jobs`, { cache: "no-store" });
    if (res.ok) setJobs(((await res.json()) as { jobs: Job[] }).jobs);
  }

  useEffect(() => {
    const active = jobs.some((j) => j.status === "queued" || j.status === "running");
    if (!active) return;
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, companyId]);

  async function enqueue(kind: "ok" | "retry") {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/v1/companies/${companyId}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "noop",
        idempotencyKey: `${kind}-${Date.now()}`,
        payload: kind === "ok" ? { message: "hello" } : { message: "retry me", failUntilAttempt: 2 },
      }),
    });
    setPending(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(data?.error?.message ?? "Could not queue job");
      return;
    }
    await refresh();
  }

  async function cancel(jobId: string) {
    await fetch(`/api/v1/jobs/${jobId}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => enqueue("ok")} className="rounded bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          Queue test job
        </button>
        <button type="button" disabled={pending} onClick={() => enqueue("retry")} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">
          Queue job that fails once, then retries
        </button>
      </div>
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {jobs.length === 0 ? (
        <p className="rounded border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No jobs yet.</p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((job) => (
            <li key={job.id} className="rounded border border-slate-200 bg-white p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-slate-500">{job.id}</span>
                <span className={`rounded border px-2 py-0.5 text-xs ${statusStyles[job.status]}`}>{job.status}</span>
              </div>
              <p className="mt-1">
                {job.kind} · attempt {job.attempts}/{job.maxAttempts}
                {job.errorCode && <span className="text-red-700"> · {job.errorCode}: {job.errorMessage}</span>}
              </p>
              {job.result && <pre className="mt-1 overflow-x-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(job.result)}</pre>}
              {(job.status === "queued" || job.status === "running") && (
                <button type="button" onClick={() => cancel(job.id)} className="mt-2 text-xs underline">Cancel</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
