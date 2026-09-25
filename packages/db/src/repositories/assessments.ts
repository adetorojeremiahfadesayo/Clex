import { type Assessment, type AssessmentResult, type ChecklistItem, type ChecklistStatus, assessmentResultSchema } from "@lex/domain";
import type { Queryable } from "../pool";

interface AssessmentRow {
  id: string;
  company_id: string;
  profile_revision_id: string;
  result: unknown;
  generated_at: Date;
}

function toAssessment(r: AssessmentRow): Assessment {
  return {
    id: r.id,
    companyId: r.company_id,
    profileRevisionId: r.profile_revision_id,
    result: assessmentResultSchema.parse(r.result),
    generatedAt: r.generated_at.toISOString(),
  };
}

export async function insertAssessment(
  db: Queryable,
  input: { companyId: string; profileRevisionId: string; result: AssessmentResult },
): Promise<Assessment> {
  const { rows } = await db.query<AssessmentRow>(
    `insert into assessments (company_id, profile_revision_id, result) values ($1, $2, $3)
     returning id, company_id, profile_revision_id, result, generated_at`,
    [input.companyId, input.profileRevisionId, JSON.stringify(input.result)],
  );
  return toAssessment(rows[0]!);
}

export async function getLatestAssessment(db: Queryable, companyId: string): Promise<Assessment | null> {
  const { rows } = await db.query<AssessmentRow>(
    `select id, company_id, profile_revision_id, result, generated_at from assessments
      where company_id = $1 order by generated_at desc limit 1`,
    [companyId],
  );
  return rows[0] ? toAssessment(rows[0]) : null;
}

interface ItemRow {
  id: string;
  company_id: string;
  rule_id: string;
  rule_version: string;
  assessment_id: string;
  status: ChecklistStatus;
  version: number;
  evidence: string | null;
  reason: string | null;
  completed_by: string | null;
  completed_at: Date | null;
  updated_at: Date;
}

const itemCols = "id, company_id, rule_id, rule_version, assessment_id, status, version, evidence, reason, completed_by, completed_at, updated_at";

function toItem(r: ItemRow): ChecklistItem {
  return {
    id: r.id,
    companyId: r.company_id,
    ruleId: r.rule_id,
    ruleVersion: r.rule_version,
    assessmentId: r.assessment_id,
    status: r.status,
    version: r.version,
    evidence: r.evidence,
    reason: r.reason,
    completedBy: r.completed_by,
    completedAt: r.completed_at?.toISOString() ?? null,
    updatedAt: r.updated_at.toISOString(),
  };
}

/**
 * Reconcile checklist rows with an assessment: create missing items as
 * `suggested`, re-point applicable ones at the new assessment, and mark items
 * whose rule no longer applies as `superseded` unless the user already completed them.
 */
export async function syncChecklist(
  db: Queryable,
  input: { companyId: string; assessment: Assessment; applicableRuleIds: { id: string; version: string }[] },
): Promise<ChecklistItem[]> {
  const applicable = new Map(input.applicableRuleIds.map((r) => [r.id, r.version]));
  const existing = await listChecklist(db, input.companyId);
  const seen = new Set<string>();
  for (const item of existing) {
    seen.add(item.ruleId);
    if (applicable.has(item.ruleId)) {
      if (item.status === "superseded") {
        await db.query(
          "update checklist_items set status = 'suggested', version = version + 1, assessment_id = $2, rule_version = $3 where id = $1",
          [item.id, input.assessment.id, applicable.get(item.ruleId)],
        );
      } else {
        await db.query("update checklist_items set version = version + 1, assessment_id = $2, rule_version = $3 where id = $1", [
          item.id,
          input.assessment.id,
          applicable.get(item.ruleId),
        ]);
      }
    } else if (item.status === "superseded") {
      continue;
    } else if (item.status === "user_completed" || item.status === "reviewer_verified") {
      // Completed work is preserved; only re-pointed at the new assessment.
      await db.query("update checklist_items set version = version + 1, assessment_id = $2 where id = $1", [item.id, input.assessment.id]);
    } else {
      await db.query("update checklist_items set status = 'superseded', version = version + 1, assessment_id = $2 where id = $1", [
        item.id,
        input.assessment.id,
      ]);
    }
  }
  for (const [ruleId, version] of applicable) {
    if (seen.has(ruleId)) continue;
    await db.query(
      "insert into checklist_items (company_id, rule_id, rule_version, assessment_id) values ($1, $2, $3, $4)",
      [input.companyId, ruleId, version, input.assessment.id],
    );
  }
  return listChecklist(db, input.companyId);
}

export async function listChecklist(db: Queryable, companyId: string): Promise<ChecklistItem[]> {
  const { rows } = await db.query<ItemRow>(`select ${itemCols} from checklist_items where company_id = $1 order by created_at`, [companyId]);
  return rows.map(toItem);
}

export async function getChecklistItem(db: Queryable, itemId: string): Promise<ChecklistItem | null> {
  const { rows } = await db.query<ItemRow>(`select ${itemCols} from checklist_items where id = $1`, [itemId]);
  return rows[0] ? toItem(rows[0]) : null;
}

export class VersionConflictError extends Error {
  constructor() {
    super("This item changed since you loaded it. Refresh and try again.");
  }
}

/** Applies a validated transition; the caller must have already run checkChecklistTransition. */
export async function applyChecklistTransition(
  db: Queryable,
  input: { itemId: string; expectedVersion: number; to: ChecklistStatus; evidence?: string | undefined; reason?: string | undefined; actorId: string },
): Promise<ChecklistItem> {
  const done = input.to === "user_completed" || input.to === "reviewer_verified";
  try {
    const { rows } = await db.query<ItemRow>(
      `update checklist_items
          set status = $3,
              version = $2 + 1,
              evidence = coalesce($4, evidence),
              reason = case when $3 in ('dismissed_with_reason','blocked') then $5 else reason end,
              completed_by = case when $6 then $7::uuid else completed_by end,
              completed_at = case when $6 then now() else completed_at end
        where id = $1 and version = $2
        returning ${itemCols}`,
      [input.itemId, input.expectedVersion, input.to, input.evidence ?? null, input.reason ?? null, done, input.actorId],
    );
    if (!rows[0]) throw new VersionConflictError();
    return toItem(rows[0]);
  } catch (error) {
    if ((error as { code?: string }).code === "40001") throw new VersionConflictError();
    throw error;
  }
}
