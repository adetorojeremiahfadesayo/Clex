import { type ChecklistItem, type FactMap, type Finding, answeredString } from "@lex/domain";
import type { Matter, MatterAnalysis, MatterDocument, MatterDraft } from "@lex/db";
import { findRule } from "@lex/content";
import { isConversation } from "./agent";
import { type CompanyModule, companyModules } from "./modules";

export type ModuleStatus = "not_started" | "in_progress" | "needs_attention" | "in_order";
export const statusLabels: Record<ModuleStatus, string> = { not_started: "Not started", in_progress: "In progress", needs_attention: "Needs attention", in_order: "In order" };

export interface ModuleData { matter: Matter; documents: MatterDocument[]; analyses: MatterAnalysis[]; drafts: MatterDraft[] }
export interface ModuleView {
  module: CompanyModule;
  matterId: string | null;
  status: ModuleStatus;
  tasks: { label: string; done: boolean }[];
  attention: string | null;
  recommended: string | null;
}

// Starter rules that point at an area of the running company.
const ruleModule: Record<string, string> = { "licence-question": "licences", "hiring-preparation": "hiring", "supplier-agreements": "contracts", "customer-data-inventory": "privacy" };
const latest = <T extends { createdAt: string }>(xs: T[]) => [...xs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

export function moduleViews(data: ModuleData[], checklist: ChecklistItem[]): ModuleView[] {
  return companyModules.map((m) => {
    const mine = data.filter((d) => d.matter.context.topic === m.id);
    const docs = mine.flatMap((d) => d.documents);
    const analyses = mine.flatMap((d) => d.analyses).filter((a) => a.status !== "failed");
    const drafts = mine.flatMap((d) => d.drafts);
    const lastAnalysis = latest(analyses);
    const staleAnalysis = !!lastAnalysis && docs.some((document) => document.createdAt > lastAnalysis.createdAt);
    const done = {
      document: docs.some((d) => !isConversation(d)),
      conversation: docs.some(isConversation),
      review: analyses.length > 0 && !staleAnalysis,
      draft: drafts.length > 0,
    };
    const tasks = m.tasks.map((t) => ({ label: t.label, done: done[t.kind] }));
    const open = lastAnalysis?.findings.filter((f: Finding) => f.kind !== "observation") ?? [];
    // A saved draft is a proposed response, not proof that the source issue is resolved.
    const unresolved = !!lastAnalysis && open.length > 0;
    const doneCount = tasks.filter((t) => t.done).length;
    const status: ModuleStatus = unresolved ? "needs_attention" : doneCount === 0 ? "not_started" : doneCount === tasks.length ? "in_order" : "in_progress";
    const rule = checklist.find((i) => ruleModule[i.ruleId] === m.id && i.status !== "superseded" && i.status !== "dismissed_with_reason");
    return {
      module: m,
      matterId: latest(mine.map((d) => d.matter))?.id ?? null,
      status,
      tasks,
      attention: unresolved ? staleAnalysis ? `The last check found ${open.length} issue${open.length === 1 ? "" : "s"}, including “${open[0]!.title}”, but a source changed afterward. Run the check again; a saved draft alone does not clear a finding.` : `${open.length} issue${open.length === 1 ? "" : "s"} remain, including “${open[0]!.title}”. A saved draft alone does not clear a finding; re-check the updated source to confirm.` : staleAnalysis ? "Your sources changed after the last check. Run the review again to refresh these findings." : null,
      recommended: rule ? findRule(rule.ruleId)?.action ?? null : null,
    };
  });
}

export function complianceScore(views: ModuleView[]) {
  const all = views.flatMap((v) => v.tasks);
  return all.length ? Math.round((all.filter((t) => t.done).length / all.length) * 100) : 0;
}

export interface CalendarEntry { date: string | null; title: string; moduleId: string; placeholder: boolean; source: string }

function addMonths(iso: string, months: number) {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Placeholder schedule relative to the recorded registration date, plus deadlines spotted in the user's own sources. */
export function complianceCalendar(facts: FactMap, data: ModuleData[]): CalendarEntry[] {
  const base = facts.registration_status?.recordedAt || new Date().toISOString();
  const licences = answeredString(facts, "regulated_activity") !== "no";
  const planned: [number, string, string][] = [
    [3, "Hold a founder meeting and record the minutes", "governance"],
    [6, "Review your supplier and customer contracts", "contracts"],
    [9, "Review your privacy notice and data register", "privacy"],
    [12, "Annual return / confirmation filing", "governance"],
    [12, "Company tax return", "tax"],
    ...(licences ? [[12, "Renew permits and licences", "licences"] as [number, string, string]] : []),
  ];
  const entries: CalendarEntry[] = planned.map(([m, title, moduleId]) => ({ date: addMonths(base, m), title, moduleId, placeholder: true, source: "Placeholder date" }));
  for (const d of data) {
    for (const a of d.analyses) {
      for (const f of a.findings) {
        if (f.title === "Deadline mentioned" && f.documentExcerpt) {
          entries.push({ date: null, title: f.documentExcerpt.replace(/^[^:“”"]{1,60}:\s+/, ""), moduleId: d.matter.context.topic ?? "", placeholder: false, source: "Mentioned in your conversations" });
        }
      }
    }
  }
  const seen = new Set<string>();
  return entries.filter((e) => (seen.has(e.title) ? false : (seen.add(e.title), true))).sort((a, b) => (a.date ?? "0").localeCompare(b.date ?? "0"));
}
