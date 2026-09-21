import { NextResponse } from "next/server";
import { uuidSchema } from "@lex/domain";
import { cancelJob, getJob } from "@lex/db";
import { ApiError, handle, requireUser } from "@/lib/api";
import { asActor } from "@/lib/db";

type Ctx = { params: Promise<{ jobId: string }> };

export const GET = handle(async (_request: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { jobId } = await ctx.params;
  if (!uuidSchema.safeParse(jobId).success) throw new ApiError(404, "not_found", "Job not found");
  const job = await asActor(user.id, (db) => getJob(db, jobId));
  if (!job) throw new ApiError(404, "not_found", "Job not found");
  return NextResponse.json({ job });
});

export const DELETE = handle(async (_request: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { jobId } = await ctx.params;
  if (!uuidSchema.safeParse(jobId).success) throw new ApiError(404, "not_found", "Job not found");
  const job = await asActor(user.id, async (db) => {
    const existing = await getJob(db, jobId);
    if (!existing) return null;
    return (await cancelJob(db, jobId)) ?? existing;
  });
  if (!job) throw new ApiError(404, "not_found", "Job not found");
  return NextResponse.json({ job });
});
