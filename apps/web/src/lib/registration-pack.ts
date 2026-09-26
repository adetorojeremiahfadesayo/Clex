import { type Company, type FactKey, type FactMap, doneStatuses, intakeQuestions, marketLabels, type Market } from "@lex/domain";
import type { ChecklistView } from "./checklist-view";
import type { loadCompanyStart } from "./company-start";
import { type Block, renderPdf } from "./pdf";
import { parseFounders, parseNames } from "./registration";
import { companyModules } from "./modules";

const registrationKeys = new Set<FactKey>(["proposed_names", "founder_details", "registered_address"]);

type StartData = Awaited<ReturnType<typeof loadCompanyStart>>;

export function factText(facts: FactMap, key: FactKey): string | null {
  const f = facts[key];
  if (!f) return null;
  if (f.value.state === "unknown") return "Not sure";
  if (f.value.state === "skipped") return null;
  const raw = String(f.value.value);
  if (key === "formation_country") return marketLabels[raw as Market] ?? raw;
  return intakeQuestions.find((q) => q.key === key)?.options?.find((o) => o.value === raw)?.label ?? raw;
}

/** Registration preparation pack for a founder to take to a lawyer or registrar agent. */
export async function renderRegistrationPack(company: Company, data: StartData, view: ChecklistView, generatedAt: string) {
  const facts = data.revision?.facts ?? {};
  const rows = intakeQuestions.filter((q) => !registrationKeys.has(q.key)).map((q) => [q.prompt, factText(facts, q.key)] as [string, string | null]).filter((r): r is [string, string] => !!r[1]);
  const open = view.entries.filter((e) => !doneStatuses.includes(e.item.status) && e.item.status !== "dismissed_with_reason");
  const unknowns = (data.assessment?.result.unknownFactKeys ?? []).map((k) => intakeQuestions.find((q) => q.key === k)?.prompt ?? k);
  const sources = [...new Map(view.entries.flatMap((e) => e.sources).map((s) => [s.id, s])).values()];
  const blocks: Block[] = [
    { type: "title", text: `${company.name}: registration pack`, sub: `Prepared with Clex on ${generatedAt.slice(0, 10)} · profile revision ${data.revision?.version ?? 0}` },
    { type: "note", text: "Preparation material for a qualified lawyer or registration agent. It is not legal advice and has not been reviewed by a lawyer. Facts are as confirmed by the founder, not verified with any registry." },
    { type: "h2", text: "1. Registration details" },
    { type: "kv", rows: [
      ["Proposed names (in order)", parseNames(facts.proposed_names?.value.state === "answered" ? String(facts.proposed_names.value.value) : undefined).map((n, i) => `${i + 1}. ${n}`).join("\n") || "Not provided"],
      ["Founders and shares", parseFounders(facts.founder_details?.value.state === "answered" ? String(facts.founder_details.value.value) : undefined).map((f) => `${f.name}, ${f.role}${f.share ? `, ${f.share}%` : ""}`).join("\n") || "Not provided"],
      ["Registered address", factText(facts, "registered_address") ?? "Not provided"],
      ["Legal form", factText(facts, "legal_form") ?? "Not provided"],
      ["Where formed", [factText(facts, "formation_country"), factText(facts, "formation_subdivision")].filter(Boolean).join(", ") || "Not provided"],
      ["Business activity", factText(facts, "activities") ?? "Not provided"],
    ] },
    { type: "h2", text: "2. Company at a glance" },
    { type: "kv", rows: rows.slice(0, 40) },
    { type: "h2", text: "3. Questions for your lawyer" },
    { type: "list", items: [...unknowns.map((u) => `We answered “Not sure” to: ${u}`), ...open.filter((e) => e.rule.category === "formation").map((e) => `Please help with: ${e.rule.action}`)].slice(0, 20).concat(unknowns.length ? [] : ["No “Not sure” answers recorded."]) },
    { type: "h2", text: "4. After registration: compliance areas to set up" },
    { type: "list", items: companyModules.map((m) => `${m.title}: ${m.blurb}`) },
    { type: "h2", text: "5. Official starting points" },
    sources.length ? { type: "list", items: sources.map((s) => `${s.authority}: ${s.title} (${s.url})`) } : { type: "p", text: "No formation market selected, so no official directory is listed.", muted: true },
    { type: "h2", text: "6. About this pack" },
    { type: "p", text: view.contentNotice, muted: true },
  ];
  return renderPdf(blocks, `${company.name} · Clex registration pack · not legal advice`);
}
