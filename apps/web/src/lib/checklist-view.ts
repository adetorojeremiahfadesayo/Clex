import { type Assessment, type ChecklistItem, type ChecklistStatus, type Market, type ProfileRevision, type RuleDecision, doneStatuses } from "@lex/domain";
import { type ChecklistRule, type OfficialSource, findRule, sourcesForMarket } from "@lex/content";
import type { PackVersion } from "@lex/domain";

export interface ChecklistEntry {
  item: ChecklistItem;
  rule: ChecklistRule;
  decision: RuleDecision | undefined;
  sources: OfficialSource[];
}

export interface ChecklistView {
  contentNotice: string;
  contentVersion: string | null;
  stale: boolean;
  progress: { done: number; applicable: number; unknown: number };
  entries: ChecklistEntry[];
  superseded: ChecklistEntry[];
}

/** Adapts a reviewed pack rule to the shape the checklist UI renders. */
function ruleFromPack(pv: PackVersion, ruleId: string, sourceIndex: Map<string, OfficialSource>): { rule: ChecklistRule; sources: OfficialSource[] } | null {
  const r = pv.content.rules.find((x) => x.id === ruleId);
  if (!r) return null;
  const rule: ChecklistRule = {
    id: r.id, version: `v${pv.version}`, status: "synthetic", category: r.category, priority: r.priority, action: r.action,
    whyGeneric: r.reasonWhenUnknown, gather: r.gather, prerequisites: r.prerequisites, sourceIds: r.sourceSlugs, requiredFacts: [],
    evaluate: () => ({ applicability: "unknown", reason: r.reasonWhenUnknown, factKeysUsed: [], missingFactKeys: [] }),
  };
  return { rule, sources: r.sourceSlugs.map((s) => sourceIndex.get(s)).filter((s): s is OfficialSource => !!s) };
}

export function buildChecklistView(
  data: { revision: ProfileRevision | null; assessment: Assessment | null; items: ChecklistItem[]; stale: boolean },
  pack?: { version: PackVersion; sources: OfficialSource[] } | null,
): ChecklistView {
  const decisions = new Map(data.assessment?.result.decisions.map((d) => [d.ruleId, d]) ?? []);
  const market = (data.assessment?.result.coverage.market ?? null) as Market | null;
  const directory = sourcesForMarket(market ?? undefined);
  const packSources = new Map((pack?.sources ?? []).map((s) => [s.id, s]));
  const entries: ChecklistEntry[] = [];
  const superseded: ChecklistEntry[] = [];
  for (const item of data.items) {
    const fromPack = pack && data.assessment?.result.mode === "reviewed_pack" ? ruleFromPack(pack.version, item.ruleId, packSources) : null;
    const rule = fromPack?.rule ?? findRule(item.ruleId);
    if (!rule) continue;
    const entry: ChecklistEntry = {
      item,
      rule,
      decision: decisions.get(item.ruleId),
      sources: fromPack ? fromPack.sources : rule.sourceIds === "market_directory" ? directory : [],
    };
    (item.status === "superseded" ? superseded : entries).push(entry);
  }
  const order: Record<ChecklistStatus, number> = {
    in_progress: 0, evidence_submitted: 0, accepted: 1, suggested: 2, blocked: 3, dismissed_with_reason: 4, user_completed: 5, reviewer_verified: 5, superseded: 6,
  };
  entries.sort((a, b) => order[a.item.status] - order[b.item.status] || a.rule.priority - b.rule.priority);
  const applicable = entries.filter((e) => e.item.status !== "dismissed_with_reason");
  return {
    contentNotice: data.assessment
      ? data.assessment.result.mode === "reviewed_pack"
        ? `Checklist generated from reviewed pack ${data.assessment.result.contentVersion}. ${data.assessment.result.coverage.notice} Reviewed content is not individual legal advice.`
        : `Checklist generated from ${data.assessment.result.contentVersion} (synthetic starter rules, not reviewed legal content). ${data.assessment.result.coverage.notice}`
      : "No assessment yet. Confirm intake answers to generate a starting checklist.",
    contentVersion: data.assessment?.result.contentVersion ?? null,
    stale: data.stale,
    progress: {
      done: applicable.filter((e) => doneStatuses.includes(e.item.status)).length,
      applicable: applicable.length,
      unknown: applicable.filter((e) => e.decision?.applicability === "unknown").length,
    },
    entries,
    superseded,
  };
}
