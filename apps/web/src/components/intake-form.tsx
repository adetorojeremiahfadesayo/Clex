"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { IntakeGroup } from "@lex/domain";
import { DEMO_UNKNOWN, demoAnswers } from "@/lib/demo-answers";

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
type Mode = "answer" | "unknown" | "skipped" | "";

export function IntakeForm({
  companyId,
  currentVersion,
  groups,
  demoMode = false,
}: {
  companyId: string;
  currentVersion: number;
  groups: { group: IntakeGroup; label: string; questions: IntakeQuestionView[] }[];
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const questions = groups.flatMap((g) => g.questions);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(questions.map((q) => [q.key, q.current ?? ""])));
  // Existing answers remain visible, but only explicit edits belong in this revision.
  const [modes, setModes] = useState<Record<string, Mode>>({});
  const touched = Object.values(modes).filter(Boolean).length;

  function setValue(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setModes((m) => ({ ...m, [key]: value.trim() ? "answer" : "" }));
  }
  function toggleMode(key: string, mode: "unknown" | "skipped") {
    setModes((m) => ({ ...m, [key]: m[key] === mode ? "" : mode }));
  }
  function pickDemo(q: IntakeQuestionView) {
    const demo = demoAnswers[q.key as keyof typeof demoAnswers];
    if (demo === undefined) return;
    if (demo === DEMO_UNKNOWN) setModes((m) => ({ ...m, [q.key]: "unknown" }));
    else setValue(q.key, demo);
  }
  function fillAllDemo() {
    for (const q of questions) if (q.state === "missing") pickDemo(q);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const answers: Record<string, Answer> = {};
    for (const q of questions) {
      const mode = modes[q.key];
      if (mode === "unknown") answers[q.key] = { state: "unknown" };
      else if (mode === "skipped") answers[q.key] = { state: "skipped" };
      else if (mode === "answer") {
        const raw = (values[q.key] ?? "").trim();
        if (!raw) continue;
        answers[q.key] = { state: "answered", value: q.kind === "number" ? Number(raw) : raw };
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
    <form onSubmit={onSubmit} className="space-y-6">
      {demoMode && (
        <div className="clex-demo-banner" role="region" aria-label="Demo answers">
          <div>
            <strong>Demo answers are on.</strong>
            <p>Each question shows a sample answer for a synthetic Lagos bakery. Click it to pick it, or choose a different answer yourself. Nothing is saved until you confirm.</p>
          </div>
          <div className="clex-demo-banner-actions">
            <button type="button" className="button-primary" onClick={fillAllDemo}>Pick all demo answers</button>
            <Link href="?" className="clex-link">Hide demo answers</Link>
          </div>
        </div>
      )}
      {groups.map((g) => (
        <fieldset key={g.group} className="clex-intake-group">
          <legend>{g.label}</legend>
          {g.questions.map((q) => (
            <Question
              key={q.key}
              q={q}
              value={values[q.key] ?? ""}
              mode={modes[q.key] ?? ""}
              onValue={(v) => setValue(q.key, v)}
              onToggle={(m) => toggleMode(q.key, m)}
              demo={demoMode ? demoAnswers[q.key as keyof typeof demoAnswers] : undefined}
              onPickDemo={() => pickDemo(q)}
            />
          ))}
        </fieldset>
      ))}
      {error && (
        <p role="alert" className="clex-alert">{error}</p>
      )}
      <div className="clex-savebar">
        <button type="submit" disabled={pending} className="button-primary">
          {pending ? "Saving…" : "Save and confirm answers"}
        </button>
        <span>
          Saving creates profile revision {currentVersion + 1}. Only questions you touch are recorded{touched ? ` (${touched} selected)` : ""}.
        </span>
      </div>
    </form>
  );
}

function Question({ q, value, mode, onValue, onToggle, demo, onPickDemo }: {
  q: IntakeQuestionView;
  value: string;
  mode: Mode;
  onValue: (value: string) => void;
  onToggle: (mode: "unknown" | "skipped") => void;
  demo: string | undefined;
  onPickDemo: () => void;
}) {
  const inputId = `q-${q.key}`;
  const labelId = `${inputId}-label`;
  const stateLabel = q.state === "answered" ? "Confirmed" : q.state === "unknown" ? "Not sure" : q.state === "skipped" ? "Skipped" : "Not answered";
  const demoLabel = demo === undefined ? undefined : demo === DEMO_UNKNOWN ? "Not sure" : q.options?.find((o) => o.value === demo)?.label ?? demo;
  const demoPicked = demo !== undefined && (demo === DEMO_UNKNOWN ? mode === "unknown" : mode === "answer" && value === demo);
  return (
    <div className="clex-question">
      <div className="clex-question-head">
        {q.kind === "choice"
          ? <span id={labelId} className="clex-question-prompt">{q.prompt}</span>
          : <label id={labelId} htmlFor={inputId} className="clex-question-prompt">{q.prompt}</label>}
        <span className={`clex-state-pill ${q.state === "missing" ? "is-missing" : ""}`}>{stateLabel}</span>
      </div>
      {q.help && <p className="clex-question-help">{q.help}</p>}
      <div className="clex-question-controls">
        {q.kind === "choice" ? (
          <div role="radiogroup" aria-labelledby={labelId} className="clex-options">
            {q.options?.map((o) => (
              <label key={o.value} className="clex-option">
                <input type="radio" name={q.key} value={o.value} checked={value === o.value} onChange={() => onValue(o.value)} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        ) : (
          <input
            id={inputId}
            name={q.key}
            type={q.kind === "number" ? "number" : "text"}
            min={q.kind === "number" ? 0 : undefined}
            value={value}
            onChange={(e) => onValue(e.target.value)}
            className="field clex-question-input"
          />
        )}
        {(q.allowUnknown || q.allowSkip) && (
          <div className="clex-question-toggles">
            {q.allowUnknown && (
              <button type="button" onClick={() => onToggle("unknown")} aria-pressed={mode === "unknown"} className="clex-toggle is-unknown">Not sure</button>
            )}
            {q.allowSkip && (
              <button type="button" onClick={() => onToggle("skipped")} aria-pressed={mode === "skipped"} className="clex-toggle">Skip</button>
            )}
          </div>
        )}
      </div>
      {demoLabel !== undefined && (
        <button type="button" className="clex-demo-chip" aria-pressed={demoPicked} onClick={onPickDemo}>
          <span className="clex-demo-chip-tag">Demo answer</span>{demoLabel}{demoPicked ? " ✓" : ""}
        </button>
      )}
    </div>
  );
}
