import {
  type AssessmentResult,
  type FactKey,
  type FactMap,
  type Market,
  type PackVersion,
  type RuleDecision,
  answeredString,
  evaluateContentRule,
  factKeys,
  factState,
  marketLabels,
  markets,
} from "@lex/domain";
import { SYNTHETIC_CONTENT_VERSION, syntheticRules } from "./rules";

export interface PublishedPackRef {
  packId: string;
  slug: string;
  version: PackVersion;
}

function classify(facts: FactMap) {
  const confirmed: FactKey[] = [];
  const unknown: FactKey[] = [];
  const missing: FactKey[] = [];
  for (const key of factKeys) {
    const s = factState(facts, key);
    if (s === "answered") confirmed.push(key);
    else if (s === "unknown") unknown.push(key);
    else if (s === "missing") missing.push(key);
  }
  return { confirmed, unknown, missing };
}

function resolveMarket(facts: FactMap): Market | null {
  const raw = answeredString(facts, "formation_country");
  return markets.includes(raw as Market) ? (raw as Market) : null;
}

/**
 * Deterministic assessment over the confirmed fact snapshot. No model is called.
 * When a published, in-scope pack is supplied its reviewed rules are used and the
 * result is labelled reviewed_pack; otherwise synthetic starter rules apply.
 */
export function assessProfile(facts: FactMap, published?: PublishedPackRef | null): AssessmentResult {
  const { confirmed, unknown, missing } = classify(facts);
  const market = resolveMarket(facts);
  const subdivision = answeredString(facts, "formation_subdivision") ?? null;

  const inScope =
    published &&
    published.version.status === "published" &&
    (published.version.content.subdivisions.length === 0 || (subdivision !== null && published.version.content.subdivisions.includes(subdivision)));

  if (published && inScope) {
    const c = published.version.content;
    const decisions: RuleDecision[] = c.rules.map((rule) => ({ ruleId: rule.id, ruleVersion: `${published.slug}@${published.version.version}`, ...evaluateContentRule(rule, facts) }));
    return {
      mode: "reviewed_pack",
      contentVersion: `${published.slug}@${published.version.version}`,
      confirmedFactKeys: confirmed,
      unknownFactKeys: unknown,
      missingFactKeys: missing,
      decisions,
      coverage: {
        market,
        subdivision,
        packId: published.packId,
        packVersionId: published.version.id,
        packVersion: published.version.version,
        packStatus: "published",
        capabilities: c.capabilities,
        notice: `${marketLabels[market!]}${subdivision ? ` (${subdivision})` : ""}: reviewed pack ${published.slug} v${published.version.version} applies for ${c.matterTypes.join(", ")}. Excluded topics: ${c.excludedTopics.length ? c.excludedTopics.join("; ") : "none listed"}. Reviewed ${published.version.reviewedAt?.slice(0, 10) ?? "n/a"}${c.reviewDueAt ? `, review due ${c.reviewDueAt}` : ""}.`,
      },
    };
  }

  const decisions = syntheticRules.map((rule) => ({ ruleId: rule.id, ruleVersion: rule.version, ...rule.evaluate(facts) }));
  const scopeNote = published && !inScope ? ` A published pack exists for ${marketLabels[market!]} but not for subdivision "${subdivision ?? "unspecified"}".` : "";
  return {
    mode: "synthetic_demo",
    contentVersion: SYNTHETIC_CONTENT_VERSION,
    confirmedFactKeys: confirmed,
    unknownFactKeys: unknown,
    missingFactKeys: missing,
    decisions,
    coverage: {
      market,
      subdivision,
      packId: null,
      packVersionId: null,
      packVersion: null,
      packStatus: market ? "research_pointers" : "none",
      capabilities: market ? ["information_collection", "official_links"] : ["information_collection"],
      notice: market
        ? `${marketLabels[market]} is selected. No reviewed legal content pack is published for this market${subdivision ? " and subdivision" : ""} yet; only fact collection and official directory links are available.${scopeNote}`
        : "No formation market recorded. Fact collection is available; official links appear once a market is selected.",
    },
  };
}
