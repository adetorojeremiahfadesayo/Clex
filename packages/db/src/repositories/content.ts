import { createHash } from "node:crypto";
import {
  type EvalCase,
  type Market,
  type Pack,
  type PackStatus,
  type PackVersion,
  type PackVersionContent,
  type PlatformRole,
  type SourceInput,
  type SourceVersionInput,
  packVersionContentSchema,
} from "@lex/domain";
import type { Queryable } from "../pool";

export function hashContent(content: unknown): string {
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

// Platform roles --------------------------------------------------------------

export async function getPlatformRole(db: Queryable, userId: string): Promise<PlatformRole> {
  const { rows } = await db.query<{ platform_role: PlatformRole }>("select platform_role from users where id = $1", [userId]);
  return rows[0]?.platform_role ?? "none";
}

// Sources ---------------------------------------------------------------------

export interface SourceRow {
  id: string;
  slug: string;
  market: Market;
  authority: string;
  title: string;
  kind: string;
  permitted_use: string;
}

export interface SourceVersionRow {
  id: string;
  source_id: string;
  version: number;
  url: string;
  language: string;
  effective_from: string | null;
  effective_to: string | null;
  checked_at: string;
  excerpt: string;
  locator: string;
  content_hash: string;
  review_state: "unreviewed" | "reviewed" | "superseded";
  reviewed_by: string | null;
  reviewed_at: Date | null;
}

export async function upsertSource(db: Queryable, input: SourceInput, actorId: string): Promise<SourceRow> {
  const { rows } = await db.query<SourceRow>(
    `insert into sources (slug, market, authority, title, kind, permitted_use, created_by)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (slug) do update set authority = excluded.authority, title = excluded.title
     returning id, slug, market, authority, title, kind, permitted_use`,
    [input.slug, input.market, input.authority, input.title, input.kind, input.permittedUse, actorId],
  );
  return rows[0]!;
}

export async function listSources(db: Queryable, market?: Market): Promise<(SourceRow & { versions: SourceVersionRow[] })[]> {
  const { rows } = await db.query<SourceRow>(
    `select id, slug, market, authority, title, kind, permitted_use from sources ${market ? "where market = $1" : ""} order by market, slug`,
    market ? [market] : [],
  );
  const versions = await db.query<SourceVersionRow>(
    `select id, source_id, version, url, language, effective_from::text, effective_to::text, checked_at::text, excerpt, locator, content_hash, review_state, reviewed_by, reviewed_at
       from source_versions order by source_id, version desc`,
  );
  return rows.map((s) => ({ ...s, versions: versions.rows.filter((v) => v.source_id === s.id) }));
}

export async function addSourceVersion(db: Queryable, sourceId: string, input: SourceVersionInput, actorId: string): Promise<SourceVersionRow> {
  const hash = hashContent({ url: input.url, excerpt: input.excerpt, locator: input.locator, checkedAt: input.checkedAt });
  const { rows } = await db.query<SourceVersionRow>(
    `insert into source_versions (source_id, version, url, language, effective_from, effective_to, checked_at, excerpt, locator, content_hash, created_by)
     values ($1, coalesce((select max(version) from source_versions where source_id = $1), 0) + 1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     returning id, source_id, version, url, language, effective_from::text, effective_to::text, checked_at::text, excerpt, locator, content_hash, review_state, reviewed_by, reviewed_at`,
    [sourceId, input.url, input.language, input.effectiveFrom, input.effectiveTo, input.checkedAt, input.excerpt, input.locator, hash, actorId],
  );
  return rows[0]!;
}

export async function markSourceVersionReviewed(db: Queryable, versionId: string, reviewerId: string): Promise<boolean> {
  const { rowCount } = await db.query(
    "update source_versions set review_state = 'reviewed', reviewed_by = $2, reviewed_at = now() where id = $1 and review_state = 'unreviewed'",
    [versionId, reviewerId],
  );
  return (rowCount ?? 0) > 0;
}

// Packs -----------------------------------------------------------------------

interface PackRow { id: string; slug: string; market: Market; title: string; created_by: string; created_at: Date }
interface PackVersionRow {
  id: string; pack_id: string; version: number; status: PackStatus; content: unknown; content_hash: string;
  author_id: string; reviewer_id: string | null; reviewed_at: Date | null; published_at: Date | null; status_reason: string | null;
  created_at: Date; updated_at: Date;
}
const pvCols = "id, pack_id, version, status, content, content_hash, author_id, reviewer_id, reviewed_at, published_at, status_reason, created_at, updated_at";

const toPack = (r: PackRow): Pack => ({ id: r.id, slug: r.slug, market: r.market, title: r.title, createdBy: r.created_by, createdAt: r.created_at.toISOString() });
const toVersion = (r: PackVersionRow): PackVersion => ({
  id: r.id, packId: r.pack_id, version: r.version, status: r.status,
  content: packVersionContentSchema.parse(r.content), contentHash: r.content_hash,
  authorId: r.author_id, reviewerId: r.reviewer_id,
  reviewedAt: r.reviewed_at?.toISOString() ?? null, publishedAt: r.published_at?.toISOString() ?? null,
  statusReason: r.status_reason, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString(),
});

export async function upsertPack(db: Queryable, input: { slug: string; market: Market; title: string }, actorId: string): Promise<Pack> {
  const { rows } = await db.query<PackRow>(
    `insert into packs (slug, market, title, created_by) values ($1, $2, $3, $4)
     on conflict (slug) do update set title = excluded.title returning id, slug, market, title, created_by, created_at`,
    [input.slug, input.market, input.title, actorId],
  );
  return toPack(rows[0]!);
}

export async function listPacks(db: Queryable): Promise<(Pack & { versions: PackVersion[] })[]> {
  const { rows } = await db.query<PackRow>("select id, slug, market, title, created_by, created_at from packs order by market, slug");
  const versions = await db.query<PackVersionRow>(`select ${pvCols} from pack_versions order by pack_id, version desc`);
  return rows.map((p) => ({ ...toPack(p), versions: versions.rows.filter((v) => v.pack_id === p.id).map(toVersion) }));
}

export async function getPackVersion(db: Queryable, versionId: string): Promise<PackVersion | null> {
  const { rows } = await db.query<PackVersionRow>(`select ${pvCols} from pack_versions where id = $1`, [versionId]);
  return rows[0] ? toVersion(rows[0]) : null;
}

export async function createDraftVersion(db: Queryable, packId: string, content: PackVersionContent, authorId: string): Promise<PackVersion> {
  const parsed = packVersionContentSchema.parse(content);
  const { rows } = await db.query<PackVersionRow>(
    `insert into pack_versions (pack_id, version, content, content_hash, author_id)
     values ($1, coalesce((select max(version) from pack_versions where pack_id = $1), 0) + 1, $2, $3, $4)
     returning ${pvCols}`,
    [packId, JSON.stringify(parsed), hashContent(parsed), authorId],
  );
  return toVersion(rows[0]!);
}

export async function updateDraftContent(db: Queryable, versionId: string, content: PackVersionContent): Promise<PackVersion | null> {
  const parsed = packVersionContentSchema.parse(content);
  const { rows } = await db.query<PackVersionRow>(
    `update pack_versions set content = $2, content_hash = $3 where id = $1 and status = 'draft' returning ${pvCols}`,
    [versionId, JSON.stringify(parsed), hashContent(parsed)],
  );
  return rows[0] ? toVersion(rows[0]) : null;
}

export async function transitionPackVersion(
  db: Queryable,
  input: { versionId: string; to: PackStatus; reviewerId?: string | undefined; reason?: string | undefined },
): Promise<PackVersion> {
  const { rows } = await db.query<PackVersionRow>(
    `update pack_versions
        set status = $2,
            reviewer_id = coalesce($3::uuid, reviewer_id),
            reviewed_at = case when $2 in ('published','draft') and $3::uuid is not null then now() else reviewed_at end,
            status_reason = $4
      where id = $1 returning ${pvCols}`,
    [input.versionId, input.to, input.reviewerId ?? null, input.reason ?? null],
  );
  if (!rows[0]) throw new Error("pack version not found");
  return toVersion(rows[0]);
}

/** The single published version for a market, if any. Stale/withdrawn never resolve. */
export async function findPublishedPack(db: Queryable, market: Market, matterType: string): Promise<{ pack: Pack; version: PackVersion } | null> {
  const { rows } = await db.query<PackRow & { pv: unknown }>(
    `select p.id, p.slug, p.market, p.title, p.created_by, p.created_at, to_jsonb(v) as pv
       from packs p join pack_versions v on v.pack_id = p.id
      where p.market = $1 and v.status = 'published' and v.content->'matterTypes' ? $2
      order by v.published_at desc limit 1`,
    [market, matterType],
  );
  if (!rows[0]) return null;
  const raw = rows[0].pv as Record<string, unknown>;
  const version = toVersion({
    ...(raw as unknown as PackVersionRow),
    reviewed_at: raw.reviewed_at ? new Date(raw.reviewed_at as string) : null,
    published_at: raw.published_at ? new Date(raw.published_at as string) : null,
    created_at: new Date(raw.created_at as string),
    updated_at: new Date(raw.updated_at as string),
  });
  return { pack: toPack(rows[0]), version };
}

export interface EvaluationRow { id: string; pack_version_id: string; content_hash: string; total: number; passed: number; failures: unknown; run_by: string; run_at: Date }

export async function recordEvaluation(
  db: Queryable,
  input: { packVersionId: string; contentHash: string; total: number; passed: number; failures: unknown[]; runBy: string },
): Promise<EvaluationRow> {
  const { rows } = await db.query<EvaluationRow>(
    `insert into pack_evaluations (pack_version_id, content_hash, total, passed, failures, run_by) values ($1, $2, $3, $4, $5, $6)
     returning id, pack_version_id, content_hash, total, passed, failures, run_by, run_at`,
    [input.packVersionId, input.contentHash, input.total, input.passed, JSON.stringify(input.failures), input.runBy],
  );
  return rows[0]!;
}

export async function listEvaluations(db: Queryable, packVersionId: string): Promise<EvaluationRow[]> {
  const { rows } = await db.query<EvaluationRow>(
    "select id, pack_version_id, content_hash, total, passed, failures, run_by, run_at from pack_evaluations where pack_version_id = $1 order by run_at desc",
    [packVersionId],
  );
  return rows;
}

export type { EvalCase };
