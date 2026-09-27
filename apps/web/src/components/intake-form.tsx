"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { type FactKey, type FactMap, type IntakeGroup, type RecordedFact, answeredString, factState, intakeGroupLabels, intakeQuestions, intakeViews } from "@lex/domain";
import { DEMO_UNKNOWN, demoAnswers } from "@/lib/demo-answers";

type Answer = { state: "answered"; value: string | number } | { state: "unknown" } | { state: "skipped" };
type Mode = "answer" | "unknown" | "skipped" | "";
type View = ReturnType<typeof intakeViews>[number];

/** Overlays unsaved picks so follow-up questions appear before the first save. */
function withPicks(facts: FactMap, values: Record<string, string>, modes: Record<string, Mode>): FactMap {
  const merged: FactMap = { ...facts };
  for (const q of intakeQuestions) {
    const mode = modes[q.key];
    if (!mode) continue;
    const raw = (values[q.key] ?? "").trim();
    const value = mode === "answer" ? (raw ? { state: "answered" as const, value: q.kind === "number" ? Number(raw) : raw } : null) : { state: mode };
    if (value) merged[q.key] = { value, provenance: "user_asserted", recordedAt: "", recordedBy: "", sourceDocumentVersionId: null } as RecordedFact;
  }
  return merged;
}

export function IntakeForm({ companyId, currentVersion, facts, demoMode = false }: {
  companyId: string;
  currentVersion: number;
  facts: FactMap;
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(intakeQuestions.map((q) => [q.key, answeredString(facts, q.key) ?? ""])));
  // Existing answers remain visible, but only explicit edits belong in this revision.
  const [modes, setModes] = useState<Record<string, Mode>>({});
  const views = useMemo(() => intakeViews(withPicks(facts, values, modes)), [facts, values, modes]);
  const touched = views.filter((v) => modes[v.question.key]).length;
  const groups = (Object.keys(intakeGroupLabels) as IntakeGroup[])
    .map((group) => ({ group, label: intakeGroupLabels[group], views: views.filter((v) => v.question.group === group) }))
    .filter((g) => g.views.length > 0);
  const reviewIndex = groups.length;
  const onReview = stepIndex >= reviewIndex;
  const currentGroup = groups[Math.min(stepIndex, groups.length - 1)];
  const pct = Math.round((Math.min(stepIndex, reviewIndex) / reviewIndex) * 100);
  const pickedSummary = views.filter((v) => modes[v.question.key]).map((v) => {
    const mode = modes[v.question.key];
    const raw = values[v.question.key] ?? "";
    const shown = mode === "unknown" ? "Not sure" : mode === "skipped" ? "Skipped" : v.question.options?.find((o) => o.value === raw)?.label ?? raw;
    return { key: v.question.key, prompt: v.prompt, shown, step: groups.findIndex((g) => g.group === v.question.group) };
  });

  function setValue(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setModes((m) => ({ ...m, [key]: value.trim() ? "answer" : "" }));
  }
  function toggleMode(key: string, mode: "unknown" | "skipped") {
    setModes((m) => ({ ...m, [key]: m[key] === mode ? "" : mode }));
  }
  function pickDemo(key: FactKey) {
    const demo = demoAnswers[key];
    if (demo === undefined) return;
    if (demo === DEMO_UNKNOWN) setModes((m) => ({ ...m, [key]: "unknown" }));
    else setValue(key, demo);
  }
  function fillPageDemo() {
    if (!currentGroup) return;
    const nextValues = { ...values };
    const nextModes = { ...modes };
    // Filling one answer can reveal another question on this same page.
    for (let pass = 0; pass < intakeQuestions.length; pass++) {
      const pageViews = intakeViews(withPicks(facts, nextValues, nextModes))
        .filter((view) => view.question.group === currentGroup.group);
      let changed = false;
      for (const { question } of pageViews) {
        if (nextModes[question.key] || factState(facts, question.key) !== "missing") continue;
        const demo = demoAnswers[question.key];
        if (demo === undefined) continue;
        if (demo === DEMO_UNKNOWN) nextModes[question.key] = "unknown";
        else {
          nextValues[question.key] = demo;
          nextModes[question.key] = "answer";
        }
        changed = true;
      }
      if (!changed) break;
    }
    setValues(nextValues);
    setModes(nextModes);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const answers: Record<string, Answer> = {};
    for (const { question: q } of views) {
      const mode = modes[q.key];
      if (mode === "unknown") answers[q.key] = { state: "unknown" };
      else if (mode === "skipped") answers[q.key] = { state: "skipped" };
      else if (mode === "answer") {
        const raw = (values[q.key] ?? "").trim();
        if (raw) answers[q.key] = { state: "answered", value: q.kind === "number" ? Number(raw) : raw };
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
    router.replace(`/companies/${companyId}/overview${demoMode ? "?demo=1" : ""}`, { scroll: false });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="clex-wizard">
      {demoMode && !onReview && (
        <div className="clex-demo-banner" role="region" aria-label="Demo answers">
          <div>
            <strong>Demo answers are on</strong>
            <p>Fill this page, read the answers, then press Next when you are ready. You can still pick each orange demo answer separately.</p>
          </div>
          <button type="button" className="button-primary" onClick={fillPageDemo}>Fill this page with demo answers</button>
        </div>
      )}
      <div className="clex-wizard-top">
        <span>{onReview ? "Review and save" : `Step ${stepIndex + 1} of ${groups.length} · ${currentGroup?.label}`}</span>
        <div className="clex-progress" role="progressbar" aria-label="Question progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${pct}%` }} /></div>
      </div>
      {!onReview && currentGroup ? (
        <fieldset key={currentGroup.group} className="clex-intake-group">
          <legend className="sr-only">{currentGroup.label}</legend>
          {currentGroup.views.map((v) => (
            <Question
              key={v.question.key}
              view={v}
              saved={factState(facts, v.question.key)}
              value={values[v.question.key] ?? ""}
              mode={modes[v.question.key] ?? ""}
              onValue={(val) => setValue(v.question.key, val)}
              onToggle={(m) => toggleMode(v.question.key, m)}
              demo={demoMode ? demoAnswers[v.question.key] : undefined}
              onPickDemo={() => pickDemo(v.question.key)}
            />
          ))}
        </fieldset>
      ) : (
        <div className="clex-review-list">
          {pickedSummary.length === 0 ? <p className="clex-note">You haven&apos;t picked any answers yet. Go back and answer a few questions.</p> : (
            <ul>{pickedSummary.map((p) => <li key={p.key}><span>{p.prompt}</span><button type="button" onClick={() => setStepIndex(p.step)} aria-label={`Change answer: ${p.prompt}`}>{p.shown}</button></li>)}</ul>
          )}
        </div>
      )}
      {error && <p role="alert" className="clex-alert">{error}</p>}
      <div className="clex-wizard-nav">
        <button type="button" className="button-ghost" disabled={stepIndex === 0} onClick={() => setStepIndex(Math.max(0, Math.min(stepIndex, reviewIndex) - 1))}>← Back</button>
        <span className="clex-wizard-count">{touched ? `${touched} answered` : "Nothing picked yet"}</span>
        {onReview
          ? <button key="save" type="submit" disabled={pending || touched === 0} className="button-primary">{pending ? "Saving…" : "Save company answers →"}</button>
          : <button key="advance" type="button" className="button-primary" onClick={(event) => { event.preventDefault(); setStepIndex(stepIndex + 1); }}>{stepIndex === reviewIndex - 1 ? "Review answers →" : "Next →"}</button>}
      </div>
      {!demoMode && <p className="clex-wizard-foot">Saving creates profile revision {currentVersion + 1}. <Link href="?demo=1&edit=1#profile" scroll={false} className="clex-link">Show demo answers</Link></p>}
    </form>
  );
}

function Question({ view, saved, value, mode, onValue, onToggle, demo, onPickDemo }: {
  view: View;
  saved: ReturnType<typeof factState>;
  value: string;
  mode: Mode;
  onValue: (value: string) => void;
  onToggle: (mode: "unknown" | "skipped") => void;
  demo: string | undefined;
  onPickDemo: () => void;
}) {
  const q = view.question;
  const inputId = `q-${q.key}`;
  const labelId = `${inputId}-label`;
  const stateLabel = saved === "answered" ? "Confirmed" : saved === "unknown" ? "Not sure" : saved === "skipped" ? "Skipped" : null;
  const demoLabel = demo === undefined ? undefined : demo === DEMO_UNKNOWN ? "Not sure" : q.options?.find((o) => o.value === demo)?.label ?? demo;
  const demoPicked = demo !== undefined && (demo === DEMO_UNKNOWN ? mode === "unknown" : mode === "answer" && value === demo);
  return (
    <div className={`clex-question ${mode ? "is-touched" : ""}`}>
      <div className="clex-question-head">
        {q.kind === "choice"
          ? <span id={labelId} className="clex-question-prompt">{view.prompt}</span>
          : <label id={labelId} htmlFor={inputId} className="clex-question-prompt">{view.prompt}</label>}
        {stateLabel && <span className="clex-state-pill">{stateLabel}</span>}
      </div>
      {q.help && <p className="clex-question-help">{q.help}</p>}
      <div className="clex-question-controls">
        {q.kind === "choice" ? (
          <div role="radiogroup" aria-labelledby={labelId} className="clex-options">
            {q.options?.map((o) => (
              <label key={o.value} className="clex-option">
                <input type="radio" name={q.key} value={o.value} checked={value === o.value && mode !== "unknown" && mode !== "skipped"} onChange={() => onValue(o.value)} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        ) : (
          <input id={inputId} name={q.key} type={q.kind === "number" ? "number" : "text"} min={q.kind === "number" ? 0 : undefined} value={value} onChange={(e) => onValue(e.target.value)} className="field clex-question-input" />
        )}
        {(q.allowUnknown || q.allowSkip) && (
          <div className="clex-question-toggles">
            {q.allowUnknown && <button type="button" onClick={() => onToggle("unknown")} aria-pressed={mode === "unknown"} className="clex-toggle is-unknown">Not sure</button>}
            {q.allowSkip && <button type="button" onClick={() => onToggle("skipped")} aria-pressed={mode === "skipped"} className="clex-toggle">Skip</button>}
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
