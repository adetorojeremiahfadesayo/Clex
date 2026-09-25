import { NextResponse } from "next/server";
import { z } from "zod";
import { marketSchema } from "@lex/domain";
import { listPacks, upsertPack } from "@lex/db";
import { handle, parseBody, requireUser } from "@/lib/api";
import { requirePlatformRole } from "@/lib/content-authz";
import { asActor } from "@/lib/db";

const packInput = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/).max(80), market: marketSchema, title: z.string().trim().min(1).max(200) });

/** Members see published/stale versions only (RLS); editors and reviewers see drafts too. */
export const GET = handle(async () => {
  const user = await requireUser();
  const packs = await asActor(user.id, (db) => listPacks(db));
  return NextResponse.json({ packs });
});

export const POST = handle(async (request: Request) => {
  const { user } = await requirePlatformRole(["content_editor", "content_reviewer"]);
  const input = await parseBody(request, packInput);
  const pack = await asActor(user.id, (db) => upsertPack(db, input, user.id));
  return NextResponse.json({ pack }, { status: 201 });
});
