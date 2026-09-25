import { type FactMap, type ProfileRevision, factMapSchema } from "@lex/domain";
import type { Queryable } from "../pool";

interface RevisionRow {
  id: string;
  company_id: string;
  version: number;
  previous_revision_id: string | null;
  facts: unknown;
  confirmed_by: string;
  reason: string;
  created_at: Date;
}

const cols = "id, company_id, version, previous_revision_id, facts, confirmed_by, reason, created_at";

function toRevision(r: RevisionRow): ProfileRevision {
  return {
    id: r.id,
    companyId: r.company_id,
    version: r.version,
    previousRevisionId: r.previous_revision_id,
    // Stored snapshots are validated on read so a bad write can never masquerade as facts.
    facts: factMapSchema.parse(r.facts),
    confirmedBy: r.confirmed_by,
    reason: r.reason,
    createdAt: r.created_at.toISOString(),
  };
}

export async function getCurrentRevision(db: Queryable, companyId: string): Promise<ProfileRevision | null> {
  const { rows } = await db.query<RevisionRow>(
    `select ${cols} from profile_revisions where company_id = $1 order by version desc limit 1`,
    [companyId],
  );
  return rows[0] ? toRevision(rows[0]) : null;
}

export async function listRevisions(db: Queryable, companyId: string): Promise<ProfileRevision[]> {
  const { rows } = await db.query<RevisionRow>(
    `select ${cols} from profile_revisions where company_id = $1 order by version desc`,
    [companyId],
  );
  return rows.map(toRevision);
}

export async function confirmRevision(
  db: Queryable,
  input: { companyId: string; facts: FactMap; reason: string },
): Promise<ProfileRevision> {
  const { rows } = await db.query<RevisionRow>(
    `select ${cols} from app.confirm_profile_revision($1, $2, $3)`,
    [input.companyId, JSON.stringify(input.facts), input.reason],
  );
  return toRevision(rows[0]!);
}
