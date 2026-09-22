/**
 * Seeds the source registry and DRAFT formation packs for all five markets, plus two
 * synthetic platform users (content editor and content reviewer). Nothing is published;
 * publication must go through evaluation and a reviewer. Idempotent; refuses production.
 */
import { draftPackManifests } from "@lex/content";
import { getPool, closeAllPools } from "../pool";
import { withActor } from "../tenant";
import { createUser, findUserByEmail } from "../repositories/users";
import { addSourceVersion, createDraftVersion, listPacks, listSources, upsertPack, upsertSource } from "../repositories/content";

if (process.env.APP_ENV === "production") {
  console.error("seed:content refuses to run against production.");
  process.exit(2);
}
const appUrl = process.env.APP_DATABASE_URL;
const adminUrl = process.env.DATABASE_URL;
if (!appUrl || !adminUrl) {
  console.error("APP_DATABASE_URL and DATABASE_URL are required.");
  process.exit(2);
}
const app = getPool(appUrl);
const admin = getPool(adminUrl);

async function ensurePlatformUser(email: string, name: string, role: "content_editor" | "content_reviewer") {
  const user =
    (await withActor(app, null, (db) => findUserByEmail(db, email))) ??
    (await withActor(app, null, (db) => createUser(db, { email, displayName: name, password: "synthetic-demo-pass" })));
  // Role grants are a privileged operation outside the app role's reach.
  await admin.query("update users set platform_role = $2 where id = $1", [user.id, role]);
  return user;
}

const editor = await ensurePlatformUser("demo-content-editor@example.test", "Demo Content Editor", "content_editor");
await ensurePlatformUser("demo-content-reviewer@example.test", "Demo Content Reviewer", "content_reviewer");

await withActor(app, editor.id, async (db) => {
  const existingSources = new Map((await listSources(db)).map((s) => [s.slug, s]));
  const existingPacks = new Map((await listPacks(db)).map((p) => [p.slug, p]));
  for (const m of draftPackManifests) {
    for (const { source, version } of m.sources) {
      let s = existingSources.get(source.slug);
      if (!s) {
        const row = await upsertSource(db, source, editor.id);
        const v = await addSourceVersion(db, row.id, version, editor.id);
        s = { ...row, versions: [v] };
        existingSources.set(source.slug, s);
      }
    }
    let pack = existingPacks.get(m.slug);
    if (!pack) {
      const created = await upsertPack(db, { slug: m.slug, market: m.market, title: m.title }, editor.id);
      pack = { ...created, versions: [] };
    }
    if (pack.versions.length === 0) {
      const content = { ...m.content, sourceRefs: m.content.sourceRefs.map((r) => ({ slug: r.slug, versionId: existingSources.get(r.slug)?.versions[0]?.id ?? null })) };
      const v = await createDraftVersion(db, pack.id, content, editor.id);
      console.log(`draft ${m.slug} v${v.version} (${v.status}) hash ${v.contentHash.slice(0, 12)}`);
    } else {
      console.log(`exists ${m.slug} (${pack.versions.map((v) => `v${v.version}:${v.status}`).join(", ")})`);
    }
  }
});
console.log("Content seeded as DRAFT only. Editor: demo-content-editor@example.test; reviewer: demo-content-reviewer@example.test (password synthetic-demo-pass, local only).");
await closeAllPools();
