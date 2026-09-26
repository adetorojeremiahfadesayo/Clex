"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Finding } from "@lex/domain";
import type { ModuleSample } from "@/lib/modules";
import { useVoice } from "./use-voice";

interface Source { id: string; name: string; readable: boolean; type: string }
interface Message { role: "user" | "agent"; text: string; findings?: Finding[]; questions?: string[]; drafted?: number | undefined; mode?: string | undefined }

async function json(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? "Request failed");
  return data;
}

export function AgentWorkspace({ companyId, matterId, moduleTitle, asks, sample, sources, latest, draft, canEdit, modelReady }: {
  companyId: string; matterId: string; moduleTitle: string; asks: string[]; sample: ModuleSample | null;
  sources: Source[]; latest: { mode: string; findings: Finding[]; questions: string[] } | null;
  draft: { body: string; version: number } | null; canEdit: boolean; modelReady: boolean;
}) {
  const router = useRouter();
  const base = `/api/v1/companies/${companyId}/matters/${matterId}`;
  const [messages, setMessages] = useState<Message[]>(() => [
    { role: "agent", text: sources.length ? `I have ${sources.length} source${sources.length > 1 ? "s" : ""} for ${moduleTitle}. Ask me anything, or tap a suggestion.` : `Hi! I'm your ${moduleTitle} agent. Add a document or a Slack or Gmail conversation on the left, then ask me what to do.` },
    ...(latest ? [{ role: "agent" as const, text: "Here's what I found last time:", findings: latest.findings, questions: latest.questions, mode: latest.mode }] : []),
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [draftText, setDraftText] = useState(draft?.body ?? "");
  const [draftVersion, setDraftVersion] = useState(draft?.version ?? 0);
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [tab, setTab] = useState<"slack" | "gmail">(sample?.conversation.source ?? "slack");
  const [paste, setPaste] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const voice = useVoice((t) => setInput((v) => (v ? `${v} ${t}` : t)));

  async function upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    await json(`${base}/documents`, { method: "POST", body: form });
  }
  async function addConversation(text: string, source: "slack" | "gmail") {
    setError(null);
    setBusy("Importing conversation…");
    try {
      await upload(new File([text], `conversation-${source}-${Date.now()}.txt`, { type: "text/plain" }));
      setPaste("");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed"); }
    finally { setBusy(null); }
  }
  async function addDocument(file: File) {
    setError(null);
    setBusy("Reading document…");
    try { await upload(file); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(null); }
  }
  async function addConversationFile(file: File) {
    await addConversation(await file.text(), tab);
  }
  async function removeSource(id: string) {
    setBusy("Removing…");
    try { await fetch(`${base}/documents/${id}`, { method: "DELETE" }); router.refresh(); } finally { setBusy(null); }
  }
  async function ask(text: string) {
    const message = text.trim();
    if (!message) return;
    setError(null);
    setInput("");
    setMessages((m) => [...m, { role: "user", text: message }]);
    setBusy("Reading your sources…");
    try {
      const data = await json(`${base}/agent`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, allowExternalProcessing: consent }) }) as { reply: string; mode: string; findings: Finding[]; questions: string[]; draft: { body: string; version: number } | null };
      setMessages((m) => [...m, { role: "agent", text: data.reply, findings: data.findings, questions: data.questions, drafted: data.draft?.version, mode: data.mode }]);
      if (data.draft) { setDraftText(data.draft.body); setDraftVersion(data.draft.version); setDraftNote(`Draft v${data.draft.version} saved. Edit it below.`); }
      if (readAloud) voice.speak(data.reply);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
    } catch (e) {
      setMessages((m) => [...m, { role: "agent", text: `Sorry, that didn't work: ${e instanceof Error ? e.message : "unknown error"}` }]);
    } finally { setBusy(null); }
  }
  async function saveDraft() {
    setBusy("Saving draft…");
    try {
      const data = await json(`${base}/drafts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: draftText }) }) as { draft: { version: number } };
      setDraftVersion(data.draft.version);
      setDraftNote(`Saved as v${data.draft.version}.`);
    } catch (e) { setDraftNote(e instanceof Error ? e.message : "Could not save"); }
    finally { setBusy(null); }
  }
  function downloadDraft() {
    const url = URL.createObjectURL(new Blob([draftText], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${moduleTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-draft-v${draftVersion || 1}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="clex-agent-grid">
      <aside className="clex-sources" aria-label="Sources">
        <p className="eyebrow">Sources</p>
        <ul className="clex-source-list">
          {sources.map((s) => (
            <li key={s.id}>
              <span className={`clex-source-icon is-${s.type.toLowerCase()}`} aria-hidden="true">{s.type === "Slack" ? "#" : s.type === "Gmail" ? "@" : "▤"}</span>
              <span className="clex-source-name"><strong>{s.type === "Document" ? s.name : `${s.type} conversation`}</strong>{!s.readable && <em>Couldn&apos;t read text</em>}</span>
              {canEdit && <button type="button" className="clex-x" aria-label={`Remove ${s.name}`} onClick={() => void removeSource(s.id)} disabled={!!busy}>×</button>}
            </li>
          ))}
          {!sources.length && <li className="clex-source-empty">Nothing yet</li>}
        </ul>
        {canEdit && (
          <>
            <div className="clex-source-block">
              <p className="clex-field-label">Import a conversation</p>
              <div className="clex-tabs" role="tablist">
                {(["slack", "gmail"] as const).map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t === "slack" ? "Slack" : "Gmail"}</button>)}
              </div>
              <textarea className="field text-sm" rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={tab === "slack" ? "Paste messages from a Slack channel or DM…" : "Paste an email thread…"} />
              <div className="clex-row">
                <button type="button" className="button-secondary is-sm" disabled={!paste.trim() || !!busy} onClick={() => void addConversation(paste, tab)}>Add conversation</button>
                <label className="clex-link is-file">Upload export<input type="file" accept=".txt,.eml,.json,.csv,.md" onChange={(e) => { const f = e.target.files?.[0]; if (f) void addConversationFile(f); e.target.value = ""; }} /></label>
              </div>
              <p className="clex-fineprint">Direct Slack and Gmail sign-in needs app credentials on the server, which this preview doesn&apos;t have. Paste or upload an export instead.</p>
            </div>
            <div className="clex-source-block">
              <p className="clex-field-label">Add a document</p>
              <label className="clex-drop">PDF, DOCX or TXT<input type="file" accept=".pdf,.docx,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) void addDocument(f); e.target.value = ""; }} /></label>
            </div>
            {sample && (
              <div className="clex-source-block">
                <p className="clex-field-label">Demo sources</p>
                <button type="button" className="clex-demo-chip" disabled={!!busy} onClick={() => void addConversation(sample.conversation.text, sample.conversation.source)}><span className="clex-demo-chip-tag">Demo</span>Sample {sample.conversation.source === "slack" ? "Slack thread" : "Gmail thread"}</button>
                {sample.document && <button type="button" className="clex-demo-chip" disabled={!!busy} onClick={() => void addDocument(new File([sample.document!.text], sample.document!.filename, { type: "text/plain" }))}><span className="clex-demo-chip-tag">Demo</span>Sample document</button>}
              </div>
            )}
          </>
        )}
      </aside>

      <div className="clex-agent-main">
        <section className="clex-chat" aria-label="Agent chat">
          <div className="clex-chat-head">
            <span className="clex-agent-dot" aria-hidden="true" />
            <strong>Clex agent</strong>
            <span className="clex-chat-mode">{modelReady ? "Model connected" : "Local rules · no model configured"}</span>
            {voice.canSpeak && <label className="clex-switch"><input type="checkbox" checked={readAloud} onChange={(e) => { setReadAloud(e.target.checked); if (!e.target.checked) voice.stopSpeaking(); }} /><span>Read replies aloud</span></label>}
          </div>
          <div className="clex-chat-log" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`clex-msg is-${m.role}`}>
                <p>{m.text}</p>
                {m.findings && m.findings.length > 0 && (
                  <ul className="clex-findings">
                    {m.findings.map((f, j) => (
                      <li key={j} className={`is-${f.kind}`}>
                        <strong>{f.title}</strong>
                        <p>{f.explanation}</p>
                        {f.documentExcerpt && <blockquote>“{f.documentExcerpt}”</blockquote>}
                      </li>
                    ))}
                  </ul>
                )}
                {m.questions && m.questions.length > 0 && <div className="clex-questions-box"><p className="eyebrow">Ask your lawyer</p><ul>{m.questions.map((q, j) => <li key={j}>{q}</li>)}</ul></div>}
                {m.drafted && <p className="clex-msg-note">✎ Draft v{m.drafted} is ready below</p>}
                {m.role === "agent" && m.mode && <p className="clex-msg-meta">{m.mode === "live" ? "Model suggestion" : "Local preparation"} · not legal advice</p>}
              </div>
            ))}
            {busy && <div className="clex-msg is-agent is-typing"><span /><span /><span /><em>{busy}</em></div>}
            <div ref={endRef} />
          </div>
          {canEdit && (
            <>
              <div className="clex-suggest">{asks.map((a) => <button key={a} type="button" onClick={() => void ask(a)} disabled={!!busy}>{a}</button>)}</div>
              {modelReady && <label className="clex-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Send my sources and company details to the configured model provider.</label>}
              <form className="clex-composer" onSubmit={(e) => { e.preventDefault(); void ask(input); }}>
                {voice.canListen && <button type="button" className={`clex-mic ${voice.listening ? "is-on" : ""}`} onClick={voice.listen} aria-pressed={voice.listening} aria-label={voice.listening ? "Stop listening" : "Speak your question"}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V21h2v-2.07A7 7 0 0 0 19 12h-2Z" fill="currentColor" /></svg>
                </button>}
                <input className="clex-composer-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={voice.listening ? "Listening…" : "Ask the agent, or say “draft a letter”"} maxLength={2000} />
                <button type="submit" className="button-primary" disabled={!!busy || !input.trim() || (modelReady && !consent)}>Send</button>
              </form>
              {voice.error && <p className="clex-fineprint">{voice.error}</p>}
            </>
          )}
          {error && <p role="alert" className="clex-alert">{error}</p>}
        </section>

        <section className="clex-panel" aria-label="Draft">
          <div className="clex-row is-between">
            <div><p className="eyebrow">Editable draft</p><h2 className="clex-h3">{draftVersion ? `Version ${draftVersion}` : "No draft yet"}</h2></div>
            {canEdit && <button type="button" className="button-secondary is-sm" disabled={!!busy} onClick={() => void ask("Draft a letter")}>✎ Draft with agent</button>}
          </div>
          <textarea className="field clex-draft" rows={14} value={draftText} onChange={(e) => setDraftText(e.target.value)} placeholder="Ask the agent to draft a letter, or write your own here." disabled={!canEdit} />
          <div className="clex-row mt-3">
            {canEdit && <button type="button" className="button-primary is-sm" disabled={!!busy || !draftText.trim()} onClick={() => void saveDraft()}>Save new version</button>}
            <button type="button" className="button-ghost is-sm" disabled={!draftText.trim()} onClick={downloadDraft}>Download .txt</button>
            <button type="button" className="button-ghost is-sm" disabled={!draftText.trim()} onClick={() => void navigator.clipboard.writeText(draftText).then(() => setDraftNote("Copied."))}>Copy</button>
            {draftNote && <span className="clex-fineprint">{draftNote}</span>}
          </div>
        </section>
      </div>
    </div>
  );
}
