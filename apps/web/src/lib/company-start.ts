import type { PoolClient } from "@lex/db";
import {
  confirmRevision,
  getCurrentRevision,
  getLatestAssessment,
  insertAssessment,
  listChecklist,
  recordAudit,
  syncChecklist,
} from "@lex/db";
import { type ConfirmAnswersInput, type FactMap, applyAnswers } from "@lex/domain";
import { assessProfile, syntheticRules } from "@lex/content";

/**
 * Confirms intake answers as a new profile revision, then regenerates the
 * assessment and reconciles checklist items — all inside the caller's transaction.
 */
export async function confirmAnswersAndAssess(
  db: PoolClient,
  input: { companyId: string; actorId: string; answers: ConfirmAnswersInput["answers"]; reason: string },
) {
  const current = await getCurrentRevision(db, input.companyId);
  const facts: FactMap = applyAnswers(current?.facts ?? {}, input.answers, {
    userId: input.actorId,
    provenance: "user_confirmed",
    at: new Date().toISOString(),
  });
  const revision = await confirmRevision(db, { companyId: input.companyId, facts, reason: input.reason });
  const assessment = await regenerateAssessment(db, { companyId: input.companyId, actorId: input.actorId, revisionId: revision.id, facts });
  return { revision, ...assessment };
}

export async function regenerateAssessment(
  db: PoolClient,
  input: { companyId: string; actorId: string; revisionId: string; facts: FactMap },
) {
  const result = assessProfile(input.facts);
  const assessment = await insertAssessment(db, { companyId: input.companyId, profileRevisionId: input.revisionId, result });
  const applicable = result.decisions
    .filter((d) => d.applicability !== "no")
    .map((d) => ({ id: d.ruleId, version: d.ruleVersion }));
  const items = await syncChecklist(db, { companyId: input.companyId, assessment, applicableRuleIds: applicable });
  await recordAudit(db, {
    companyId: input.companyId,
    actorId: input.actorId,
    action: "assessment.generated",
    objectType: "assessment",
    objectId: assessment.id,
    summary: { mode: result.mode, contentVersion: result.contentVersion, rules: syntheticRules.length },
  });
  return { assessment, items };
}

/** Everything the overview/checklist pages need in one authorised read. */
export async function loadCompanyStart(db: PoolClient, companyId: string) {
  const [revision, assessment, items] = await Promise.all([
    getCurrentRevision(db, companyId),
    getLatestAssessment(db, companyId),
    listChecklist(db, companyId),
  ]);
  const stale = !!assessment && !!revision && assessment.profileRevisionId !== revision.id;
  return { revision, assessment, items, stale };
}
