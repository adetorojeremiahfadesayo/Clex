import { NextResponse } from "next/server";
import { z } from "zod";
import { jobKindSchema, uuidSchema } from "@lex/domain";
import { enqueueJob, getCompany, listJobs } from "@lex/db";
import { ApiError, handle, parseBody, requireUser } from "@/lib/api";
import { asActor } from "@/lib/db";
import { env } from "@/lib/env";

type Ctx = { params: Promise<{ companyId: string }> };

const enqueueSchema = z.object({
  kind: jobKindSchema,
  idempotencyKey: z.string().trim().min(1).max(200),
  payload: z.record(z.string(), z.unknown()).default({}),
});

async function resolveCompany(companyId: string, userId: string) {
  if (!uuidSchema.safeParse(companyId).success) throw new ApiError(404, "not_found", "Company not found");
  const company = await asActor(userId, (db) => getCompany(db, companyId));
  if (!company) throw new ApiError(404, "not_found", "Company not found");
  return company;
}

export const GET = handle(async (_request: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { companyId } = await ctx.params;
  await resolveCompany(companyId, user.id);
  const jobs = await asActor(user.id, (db) => listJobs(db, companyId));
  return NextResponse.json({ jobs });
});

export const POST = handle(async (request: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { companyId } = await ctx.params;
  // Tenant scope comes from the authorised path + session, never the body.
  await resolveCompany(companyId, user.id);
  const input = await parseBody(request, enqueueSchema);
  const job = await asActor(user.id, (db) =>
    enqueueJob(db, { ...input, companyId, requestedBy: user.id, maxAttempts: env().JOB_MAX_ATTEMPTS }),
  );
  return NextResponse.json({ job }, { status: 202 });
});
