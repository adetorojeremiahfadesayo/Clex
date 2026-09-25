/**
 * Idempotently seeds two SYNTHETIC companies for demonstration. All data is invented.
 * Refuses production. Uses the RLS-bound app connection so seeding proves the same
 * authorisation path as the UI.
 */
import { type FactMap, applyAnswers } from "@lex/domain";
import { assessProfile } from "@lex/content";
import { getPool, closeAllPools } from "../pool";
import { withActor } from "../tenant";
import { createUser, findUserByEmail } from "../repositories/users";
import { createCompanyWithOwner, listCompanies } from "../repositories/companies";
import { confirmRevision, getCurrentRevision } from "../repositories/profile";
import { insertAssessment, syncChecklist } from "../repositories/assessments";

if (process.env.APP_ENV === "production") {
  console.error("seed:demo refuses to run against production.");
  process.exit(2);
}
const url = process.env.APP_DATABASE_URL;
if (!url) {
  console.error("APP_DATABASE_URL is required.");
  process.exit(2);
}
const pool = getPool(url);
const PASSWORD = "synthetic-demo-pass";

const tenants = [
  {
    email: "demo-founder-a@example.test",
    name: "Demo Founder A",
    company: { name: "Synthetic Lagos Foods", lifecycleStage: "pre_registration" as const },
    answers: {
      registration_status: { state: "answered", value: "not_registered" },
      legal_form: { state: "unknown" },
      formation_country: { state: "answered", value: "NG" },
      formation_subdivision: { state: "answered", value: "Lagos" },
      industry: { state: "answered", value: "Food and beverage" },
      activities: { state: "answered", value: "Prepared meals sold to offices" },
      customer_type: { state: "answered", value: "b2b" },
      regulated_activity: { state: "unknown" },
      founder_count: { state: "answered", value: 2 },
      employee_count: { state: "answered", value: 0 },
      contractor_count: { state: "answered", value: 3 },
      hiring_plan: { state: "answered", value: "yes" },
      customer_data: { state: "answered", value: "contact" },
    },
  },
  {
    email: "demo-founder-b@example.test",
    name: "Demo Founder B",
    company: { name: "Synthetic Leeds Software Ltd", lifecycleStage: "operating" as const },
    answers: {
      registration_status: { state: "answered", value: "registered" },
      registration_number: { state: "answered", value: "SYN000001" },
      registration_evidence: { state: "answered", value: "Synthetic certificate of incorporation" },
      legal_form: { state: "answered", value: "private_company" },
      formation_country: { state: "answered", value: "GB" },
      formation_subdivision: { state: "answered", value: "England and Wales" },
      industry: { state: "answered", value: "Software" },
      activities: { state: "answered", value: "B2B analytics subscriptions" },
      customer_type: { state: "answered", value: "b2b" },
      regulated_activity: { state: "answered", value: "no" },
      founder_count: { state: "answered", value: 1 },
      employee_count: { state: "answered", value: 4 },
      contractor_count: { state: "answered", value: 0 },
      hiring_plan: { state: "answered", value: "no" },
      has_suppliers: { state: "answered", value: "yes" },
      customer_data: { state: "answered", value: "payment" },
    },
  },
] as const;

for (const t of tenants) {
  const user =
    (await withActor(pool, null, (db) => findUserByEmail(db, t.email))) ??
    (await withActor(pool, null, (db) => createUser(db, { email: t.email, displayName: t.name, password: PASSWORD })));
  const existing = await withActor(pool, user.id, (db) => listCompanies(db));
  let company = existing.find((c) => c.name === t.company.name);
  if (!company) company = await withActor(pool, user.id, (db) => createCompanyWithOwner(db, t.company));
  await withActor(pool, user.id, async (db) => {
    if (await getCurrentRevision(db, company!.id)) return;
    const facts: FactMap = applyAnswers({}, { ...t.answers }, { userId: user.id, provenance: "user_confirmed", at: new Date().toISOString() });
    const revision = await confirmRevision(db, { companyId: company!.id, facts, reason: "Synthetic demo seed" });
    const result = assessProfile(facts);
    const assessment = await insertAssessment(db, { companyId: company!.id, profileRevisionId: revision.id, result });
    await syncChecklist(db, { companyId: company!.id, assessment, applicableRuleIds: result.decisions.filter((d) => d.applicability !== "no").map((d) => ({ id: d.ruleId, version: d.ruleVersion })) });
  });
  console.log(`seeded ${t.email} → ${t.company.name} (${company.id})`);
}
console.log("Synthetic demo tenants ready. Sign in with the listed emails and password 'synthetic-demo-pass' (local only).");
await closeAllPools();
