import { type AssessmentResult, type FactKey, type FactMap, type Market, answeredString, factKeys, factState, marketLabels, markets } from "@lex/domain";
import { SYNTHETIC_CONTENT_VERSION, syntheticRules } from "./rules";

/**
 * Deterministic assessment over the confirmed fact snapshot. No model is called.
 * Output is always labelled synthetic_demo and never a compliance score.
 */
export function assessProfile(facts: FactMap): AssessmentResult {
  const confirmed: FactKey[] = [];
  const unknown: FactKey[] = [];
  const missing: FactKey[] = [];
  for (const key of factKeys) {
    const s = factState(facts, key);
    if (s === "answered") confirmed.push(key);
    else if (s === "unknown") unknown.push(key);
    else if (s === "missing") missing.push(key);
  }
  const decisions = syntheticRules.map((rule) => {
    const e = rule.evaluate(facts);
    return { ruleId: rule.id, ruleVersion: rule.version, ...e };
  });

  const marketRaw = answeredString(facts, "formation_country");
  const market = markets.includes(marketRaw as Market) ? (marketRaw as Market) : null;
  const subdivision = answeredString(facts, "formation_subdivision") ?? null;
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
      packStatus: market ? "research_pointers" : "none",
      capabilities: market ? ["information_collection", "official_links"] : ["information_collection"],
      notice: market
        ? `${marketLabels[market]} is selected. No reviewed legal content pack exists for this market yet; only fact collection and official directory links are available.`
        : "No formation market recorded. Fact collection is available; official links appear once a market is selected.",
    },
  };
}
