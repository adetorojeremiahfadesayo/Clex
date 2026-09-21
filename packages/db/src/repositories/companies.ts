import type { Company, LifecycleStage, Membership } from "@lex/domain";
import type { Queryable } from "../pool";

interface CompanyRow {
  id: string;
  name: string;
  lifecycle_stage: LifecycleStage;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

function toCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    lifecycleStage: row.lifecycle_stage,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const companyColumns = "id, name, lifecycle_stage, created_by, created_at, updated_at";

export async function createCompanyWithOwner(
  db: Queryable,
  input: { name: string; lifecycleStage: LifecycleStage },
): Promise<Company> {
  const { rows } = await db.query<CompanyRow>(
    `select ${companyColumns} from app.create_company_with_owner($1, $2)`,
    [input.name, input.lifecycleStage],
  );
  return toCompany(rows[0]!);
}

/** RLS restricts this to companies where the actor is an active member. */
export async function listCompanies(db: Queryable): Promise<Company[]> {
  const { rows } = await db.query<CompanyRow>(`select ${companyColumns} from companies order by created_at desc`);
  return rows.map(toCompany);
}

export async function getCompany(db: Queryable, companyId: string): Promise<Company | null> {
  const { rows } = await db.query<CompanyRow>(`select ${companyColumns} from companies where id = $1`, [companyId]);
  return rows[0] ? toCompany(rows[0]) : null;
}

interface MembershipRow {
  id: string;
  company_id: string;
  user_id: string;
  role: Membership["role"];
  accepted_at: Date | null;
  revoked_at: Date | null;
}

export async function listMemberships(db: Queryable, companyId: string): Promise<Membership[]> {
  const { rows } = await db.query<MembershipRow>(
    "select id, company_id, user_id, role, accepted_at, revoked_at from memberships where company_id = $1 order by created_at",
    [companyId],
  );
  return rows.map((r) => ({
    id: r.id,
    companyId: r.company_id,
    userId: r.user_id,
    role: r.role,
    acceptedAt: r.accepted_at?.toISOString() ?? null,
    revokedAt: r.revoked_at?.toISOString() ?? null,
  }));
}
