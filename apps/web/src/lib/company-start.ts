import type { PoolClient } from "@lex/db";
import {
  confirmRevision,
  findPublishedPack,
  getPackVersion,
  listPacks,
  listSources,
  getCurrentRevision,
  getLatestAssessment,
  insertAssessment,
  listChecklist,
  recordAudit,
  syncChecklist,
} from "@lex/db";
import { type ConfirmAnswersInput, type FactMap, type Market, answeredString, applyAnswers, markets } from "@lex/domain";
import { type OfficialSource, assessProfile, syntheticRules } from "@lex/content";
import type { PackVersion } from "@lex/domain";

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
  const marketRaw = answeredString(input.facts, "formation_country");
  const market = markets.includes(marketRaw as Market) ? (marketRaw as Market) : null;
  // Only a `published` version resolves; stale/withdrawn packs fall back to synthetic rules (A24).
  const published = market ? await findPublishedPack(db, market, "formation") : null;
  const result = assessProfile(input.facts, published ? { packId: published.pack.id, slug: published.pack.slug, version: published.version } : null);
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
  const revision = await getCurrentRevision(db, companyId);
  const assessment = await getLatestAssessment(db, companyId);
  const items = await listChecklist(db, companyId);
  const stale = !!assessment && !!revision && assessment.profileRevisionId !== revision.id;
  // Resolve the exact pack version the assessment was generated from (may be stale/withdrawn now).
  const packVersionId = assessment?.result.coverage.packVersionId ?? null;
  const packVersion = packVersionId ? await getPackVersion(db, packVersionId) : null;
  const pack = packVersion
    ? { version: packVersion, sources: await packSourcesFor(db, packVersion) }
    : null;
  const packStale = !!packVersion && packVersion.status !== "published";
  return { revision, assessment, items, stale, pack, packStale };
}

async function packSourcesFor(db: PoolClient, pv: PackVersion): Promise<OfficialSource[]> {
  const market = (await listPacks(db)).find((p) => p.id === pv.packId)?.market;
  if (!market) return [];
  const sources = await listSources(db, market);
  return pv.content.sourceRefs.flatMap((ref) => {
    const s = sources.find((x) => x.slug === ref.slug);
    const v = s?.versions[0];
    if (!s || !v) return [];
    return [{ id: s.slug, market, title: s.title, authority: s.authority, url: v.url, checkedAt: v.checked_at, kind: s.kind as OfficialSource["kind"], status: "research_pointer" as const }];
  });
}
