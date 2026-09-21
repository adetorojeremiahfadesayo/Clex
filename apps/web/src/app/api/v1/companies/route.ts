import { NextResponse } from "next/server";
import { createCompanyInputSchema } from "@lex/domain";
import { createCompanyWithOwner, listCompanies } from "@lex/db";
import { handle, parseBody, requireUser } from "@/lib/api";
import { asActor } from "@/lib/db";

export const GET = handle(async () => {
  const user = await requireUser();
  const companies = await asActor(user.id, (db) => listCompanies(db));
  return NextResponse.json({ companies });
});

export const POST = handle(async (request: Request) => {
  const user = await requireUser();
  const input = await parseBody(request, createCompanyInputSchema);
  const company = await asActor(user.id, (db) => createCompanyWithOwner(db, input));
  return NextResponse.json({ company }, { status: 201 });
});
