import { NextResponse } from "next/server";
import { z } from "zod";
import { marketSchema, sourceInputSchema } from "@lex/domain";
import { listSources, upsertSource } from "@lex/db";
import { handle, parseBody, requireUser } from "@/lib/api";
import { requirePlatformRole } from "@/lib/content-authz";
import { asActor } from "@/lib/db";

export const GET = handle(async (request: Request) => {
  const user = await requireUser();
  const market = z.optional(marketSchema).parse(new URL(request.url).searchParams.get("market") ?? undefined);
  const sources = await asActor(user.id, (db) => listSources(db, market));
  return NextResponse.json({ sources });
});

export const POST = handle(async (request: Request) => {
  const { user } = await requirePlatformRole(["content_editor", "content_reviewer"]);
  const input = await parseBody(request, sourceInputSchema);
  const source = await asActor(user.id, (db) => upsertSource(db, input, user.id));
  return NextResponse.json({ source }, { status: 201 });
});
