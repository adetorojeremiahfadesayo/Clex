"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { IntakeGroup } from "@lex/domain";

export interface IntakeQuestionView {
  key: string;
  group: IntakeGroup;
  prompt: string;
  help?: string | undefined;
  kind: "choice" | "text" | "number";
  options?: { value: string; label: string }[] | undefined;
  allowUnknown: boolean;
  allowSkip: boolean;
  state: "answered" | "unknown" | "skipped" | "missing";
  current: string | undefined;
}

type Answer = { state: "answered"; value: string | number } | { state: "unknown" } | { state: "skipped" };

export function IntakeForm({
  companyId,
  currentVersion,
  groups,
}: {
  companyId: string;
  currentVersion: number;
  groups: { group: IntakeGroup; label: string; questions: IntakeQuestionView[] }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [changed, setChanged] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const answers: Record<string, Answer> = {};
    for (const g of groups) {
      for (const q of g.questions) {
        const mode = form.get(`${q.key}__mode`);
        if (mode === "unknown") answers[q.key] = { state: "unknown" };
        else if (mode === "skipped") answers[q.key] = { state: "skipped" };
        else if (mode === "answer") {
          const raw = String(form.get(q.key) ?? "").trim();
          if (!raw) continue;
          answers[q.key] = { state: "answered", value: q.kind === "number" ? Number(raw) : raw };
        }
      }
    }
    if (Object.keys(answers).length === 0) {
      setPending(false);
      setError("Answer, mark Not sure, or skip at least one question before saving.");
      return;
    }
    const res = await fetch(`/api/v1/companies/${companyId}/profile`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "if-match": String(currentVersion) },
      body: JSON.stringify({ answers, reason: "Intake answers confirmed" }),
    });
    setPending(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(data?.error?.message ?? "Could not save answers");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" onChange={() => setChanged((c) => c + 1)}>
      {groups.map((g) => (
        <fieldset key={g.group} className="space-y-4 rounded border border-slate-200 bg-white p-4">
          <legend className="px-1 font-medium">{g.label}</legend>
          {g.questions.map((q) => (
            <Question key={q.key} q={q} />
          ))}
        </fieldset>
      ))}
      {error && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}
      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-[#f7f8fa] py-3">
        <button type="submit" disabled={pending} className="rounded bg-[var(--accent)] px-4 py-2 font-medium text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save and confirm answers"}
        </button>
        <span className="text-sm text-slate-600">
          Saving creates profile revision {currentVersion + 1}. Only questions you touch are recorded{changed ? ` (${changed} change${changed === 1 ? "" : "s"})` : ""}.
        </span>
      </div>
    </form>
  );
}

function Question({ q }: { q: IntakeQuestionView }) {
  const [mode, setMode] = useState<"answer" | "unknown" | "skipped" | "">(q.state === "answered" ? "answer" : q.state === "unknown" ? "unknown" : q.state === "skipped" ? "skipped" : "");
  const inputId = `q-${q.key}`;
  const stateLabel = q.state === "answered" ? "Confirmed" : q.state === "unknown" ? "Not sure" : q.state === "skipped" ? "Skipped" : "Not answered";
  return (
    <div className="space-y-2 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="font-medium text-sm">{q.prompt}</label>
        <span className={`text-xs ${q.state === "missing" ? "text-amber-700" : "text-slate-500"}`}>{stateLabel}</span>
      </div>
      {q.help && <p className="text-xs text-slate-600">{q.help}</p>}
      <input type="hidden" name={`${q.key}__mode`} value={mode} />
      <div className="flex flex-wrap items-center gap-2">
        {q.kind === "choice" ? (
          <select
            id={inputId}
            name={q.key}
            defaultValue={q.current ?? ""}
            onChange={(e) => setMode(e.target.value ? "answer" : "")}
            className="min-w-56 rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Choose…</option>
            {q.options?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <input
            id={inputId}
            name={q.key}
            type={q.kind === "number" ? "number" : "text"}
            min={q.kind === "number" ? 0 : undefined}
            defaultValue={q.current ?? ""}
            onChange={(e) => setMode(e.target.value.trim() ? "answer" : "")}
            className="min-w-56 flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
          />
        )}
        {q.allowUnknown && (
          <button type="button" onClick={() => setMode(mode === "unknown" ? "" : "unknown")} aria-pressed={mode === "unknown"} className={`rounded border px-3 py-2 text-sm ${mode === "unknown" ? "border-amber-400 bg-amber-50" : "border-slate-300"}`}>
            Not sure
          </button>
        )}
        {q.allowSkip && (
          <button type="button" onClick={() => setMode(mode === "skipped" ? "" : "skipped")} aria-pressed={mode === "skipped"} className={`rounded border px-3 py-2 text-sm ${mode === "skipped" ? "border-slate-400 bg-slate-100" : "border-slate-300"}`}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
