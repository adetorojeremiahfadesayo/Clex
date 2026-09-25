import { type Company, type FactKey, type Market, intakeQuestions, marketLabels } from "@lex/domain";
import type { ChecklistView } from "./checklist-view";
import type { loadCompanyStart } from "./company-start";

type StartData = Awaited<ReturnType<typeof loadCompanyStart>>;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const promptFor = (key: FactKey) => intakeQuestions.find((q) => q.key === key)?.prompt ?? key;

/** Printable HTML preparation brief. Facts carry provenance; nothing is presented as legal advice. */
export function renderBriefHtml(company: Company, data: StartData, view: ChecklistView, generatedAt: string): string {
  const facts = data.revision?.facts ?? {};
  const rows = (Object.entries(facts) as [FactKey, (typeof facts)[FactKey]][])
    .filter(([, f]) => !!f)
    .map(([key, f]) => {
      const v = f!.value;
      const shown = v.state === "answered" ? (key === "formation_country" && marketLabels[v.value as Market] ? marketLabels[v.value as Market] : String(v.value)) : v.state === "unknown" ? "Not sure" : "Skipped";
      return `<tr><td>${esc(promptFor(key))}</td><td>${esc(shown)}</td><td>${esc(f!.provenance.replace(/_/g, " "))}</td><td>${esc(f!.recordedAt.slice(0, 10))}</td></tr>`;
    })
    .join("");
  const unknowns = data.assessment?.result.unknownFactKeys.map((k) => `<li>${esc(promptFor(k))}</li>`).join("") ?? "";
  const missing = data.assessment?.result.missingFactKeys.map((k) => `<li>${esc(promptFor(k))}</li>`).join("") ?? "";
  const items = view.entries
    .map((e) => `<li><strong>${esc(e.rule.action)}</strong> — ${esc(e.item.status.replace(/_/g, " "))}<br><small>${esc(e.decision?.reason ?? e.rule.whyGeneric)}</small>${e.item.evidence ? `<br><small>Evidence recorded: ${esc(e.item.evidence)}</small>` : ""}</li>`)
    .join("");
  const questions = view.entries
    .filter((e) => e.decision?.applicability === "unknown")
    .map((e) => `<li>${esc(e.rule.action)}: ${esc(e.decision!.reason)}</li>`)
    .join("");
  const sources = [...new Map(view.entries.flatMap((e) => e.sources).map((s) => [s.id, s])).values()]
    .map((s) => `<li>${esc(s.authority)} — <a href="${esc(s.url)}">${esc(s.title)}</a> (official directory, checked ${esc(s.checkedAt)}; research pointer, not reviewed content)</li>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Preparation brief — ${esc(company.name)}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;color:#16202a}table{border-collapse:collapse;width:100%}td,th{border:1px solid #cbd5e1;padding:.4rem;text-align:left;vertical-align:top}h1,h2{margin-top:1.5rem}.notice{border:1px solid #f59e0b;background:#fffbeb;padding:.75rem}@media print{a{color:inherit}}</style></head><body>
<h1>Preparation brief: ${esc(company.name)}</h1>
<p class="notice"><strong>Unreviewed.</strong> This brief lists facts the founder recorded and generic preparation steps from synthetic starter rules (${esc(view.contentVersion ?? "none")}). It contains no legal advice, no verified deadlines and no professional approval. Profile revision ${data.revision?.version ?? 0}; generated ${esc(generatedAt)}; mode ${esc(data.assessment?.result.mode ?? "none")}.</p>
<h2>Coverage</h2><p>${esc(data.assessment?.result.coverage.notice ?? "No assessment generated.")}</p>
<h2>Recorded facts</h2>${rows ? `<table><thead><tr><th>Question</th><th>Answer</th><th>Provenance</th><th>Recorded</th></tr></thead><tbody>${rows}</tbody></table>` : "<p>No facts recorded.</p>"}
<p><small>“User confirmed” means the founder confirmed the answer in this tool; it is not government verification.</small></p>
<h2>Open unknowns</h2>${unknowns ? `<ul>${unknowns}</ul>` : "<p>None marked Not sure.</p>"}
<h2>Not yet asked or answered</h2>${missing ? `<ul>${missing}</ul>` : "<p>All applicable questions answered.</p>"}
<h2>Preparation checklist (${view.progress.done}/${view.progress.applicable} completed by founder; ${view.progress.unknown} with unknown applicability)</h2>${items ? `<ul>${items}</ul>` : "<p>No checklist yet.</p>"}
<h2>Questions to raise with an adviser</h2>${questions ? `<ul>${questions}</ul>` : "<p>None recorded.</p>"}
<h2>Official starting points</h2>${sources ? `<ul>${sources}</ul>` : "<p>No market selected, so no official directory is listed.</p>"}
</body></html>`;
}
