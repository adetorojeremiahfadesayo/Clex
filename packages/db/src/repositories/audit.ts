import type { Queryable } from "../pool";

export async function recordAudit(
  db: Queryable,
  input: { companyId: string; actorId: string; action: string; objectType: string; objectId: string; objectVersion?: string; summary?: Record<string, unknown> },
): Promise<void> {
  await db.query(
    `insert into audit_events (company_id, actor_user_id, action, object_type, object_id, object_version, summary)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [input.companyId, input.actorId, input.action, input.objectType, input.objectId, input.objectVersion ?? null, JSON.stringify(input.summary ?? {})],
  );
}
