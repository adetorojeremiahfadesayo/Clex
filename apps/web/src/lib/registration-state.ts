import { answeredString } from "@lex/domain";
import { hasAuditAction, listMatterDocuments, listMatters, type PoolClient } from "@lex/db";
import { loadCompanyStart } from "./company-start";
import { registrationTasks } from "./registration";

/** Loads everything the registration phase needs, inside the caller's tenant transaction. */
export async function loadRegistration(db: PoolClient, companyId: string) {
  const start = await loadCompanyStart(db, companyId);
  const packDownloaded = await hasAuditAction(db, companyId, "export.registration_pack");
  const regMatter = (await listMatters(db, companyId)).find((m) => m.context.topic === "registration") ?? null;
  const certificates = regMatter ? await listMatterDocuments(db, companyId, regMatter.id) : [];
  const facts = start.revision?.facts ?? null;
  const tasks = registrationTasks(facts, { packDownloaded, certificateUploaded: certificates.length > 0 });
  const registered = !!facts && answeredString(facts, "registration_status") === "registered";
  return { start, tasks, registered, regMatterId: regMatter?.id ?? null, certificates };
}
