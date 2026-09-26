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

/** Whether this company has recorded an audit action (RLS limits reads to members). */
export async function hasAuditAction(db: Queryable, companyId: string, action: string): Promise<boolean> {
  const { rows } = await db.query<{ found: boolean }>(`select exists (select 1 from audit_events where company_id = $1 and action = $2) as found`, [companyId, action]);
  return rows[0]?.found ?? false;
}
