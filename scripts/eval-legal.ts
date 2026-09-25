/**
 * Evaluates every pack version's reviewer cases from the draft manifests and reports
 * denominators. Exits non-zero when any case fails or when no published pack exists,
 * so the output can never be mistaken for release evidence.
 */
import { draftPackManifests, evaluatePack } from "@lex/content";

let total = 0;
let passed = 0;
let failed = 0;
for (const m of draftPackManifests) {
  const r = evaluatePack(m.content, m.cases);
  total += r.total;
  passed += r.passed;
  failed += r.failures.length;
  console.log(`${m.slug}: ${r.passed}/${r.total} cases pass; uncovered rules: ${r.uncoveredRuleIds.length ? r.uncoveredRuleIds.join(", ") : "none"}`);
  for (const f of r.failures) console.log(`  FAIL ${f.caseId} ${f.ruleId}: expected ${f.expected}, got ${f.actual}${f.detail ? ` — ${f.detail}` : ""}`);
}
console.log(`\nDenominator: ${total} reviewer-authored cases across ${draftPackManifests.length} DRAFT packs; ${passed} pass, ${failed} failures.`);
console.log("No pack is published. Draft results are workflow checks, not evidence of legal correctness.");
process.exit(failed > 0 ? 1 : 0);
