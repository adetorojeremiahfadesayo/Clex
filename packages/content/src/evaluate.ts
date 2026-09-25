import { type EvalCase, type FactMap, type FactKey, type PackVersionContent, applyAnswers, evaluateContentRule } from "@lex/domain";

export interface EvalFailure {
  caseId: string;
  ruleId: string;
  expected: string;
  actual: string;
  detail?: string;
}

export interface EvalReport {
  total: number;
  passed: number;
  failures: EvalFailure[];
  /** Rules that no case exercises; publication is allowed but this is reported. */
  uncoveredRuleIds: string[];
}

const SYSTEM_ACTOR = { userId: "00000000-0000-0000-0000-000000000000", provenance: "user_confirmed" as const, at: "1970-01-01T00:00:00.000Z" };

function factsFromCase(c: EvalCase): FactMap {
  const answers: Record<string, { state: "answered"; value: string | number } | { state: "unknown" } | { state: "skipped" }> = {};
  for (const [k, v] of Object.entries(c.facts)) {
    answers[k] = v.state === "answered" ? { state: "answered", value: v.value ?? "" } : { state: v.state };
  }
  return applyAnswers({}, answers as Partial<Record<FactKey, (typeof answers)[string]>>, SYSTEM_ACTOR);
}

/**
 * Runs reviewer-authored cases against pack content. A case passes only when every
 * expected rule outcome matches and no unacceptable claim appears in produced text.
 */
export function evaluatePack(content: PackVersionContent, cases: EvalCase[]): EvalReport {
  const failures: EvalFailure[] = [];
  const exercised = new Set<string>();
  let passed = 0;
  for (const c of cases) {
    const facts = factsFromCase(c);
    let ok = true;
    for (const [ruleId, expected] of Object.entries(c.expected)) {
      const rule = content.rules.find((r) => r.id === ruleId);
      if (!rule) {
        failures.push({ caseId: c.id, ruleId, expected, actual: "missing", detail: "rule not present in pack" });
        ok = false;
        continue;
      }
      exercised.add(ruleId);
      const outcome = evaluateContentRule(rule, facts);
      if (outcome.applicability !== expected) {
        failures.push({ caseId: c.id, ruleId, expected, actual: outcome.applicability, detail: outcome.reason });
        ok = false;
      }
      const text = `${rule.action} ${outcome.reason}`.toLowerCase();
      for (const claim of c.unacceptableClaims) {
        if (text.includes(claim.toLowerCase())) {
          failures.push({ caseId: c.id, ruleId, expected: `no "${claim}"`, actual: "present", detail: outcome.reason });
          ok = false;
        }
      }
    }
    if (ok) passed += 1;
  }
  return { total: cases.length, passed, failures, uncoveredRuleIds: content.rules.filter((r) => !exercised.has(r.id)).map((r) => r.id) };
}
