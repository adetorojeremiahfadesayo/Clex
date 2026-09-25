import { NextResponse } from "next/server";
import { z } from "zod";
import { createMatterDraft, getMatter, listMatterDrafts } from "@lex/db";
import { ApiError, handle, parseBody, requireUser } from "@/lib/api";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";
import { draftOutline } from "@/lib/draft-outline";

type Context={params:Promise<{companyId:string;matterId:string}>};
export const GET=handle(async (_request:Request,{params}:Context)=>{
  const user=await requireUser();const {companyId,matterId}=await params;await resolveCompanyForActor(companyId,user.id);
  const drafts=await asActor(user.id,async db=>{if(!await getMatter(db,companyId,matterId))throw new ApiError(404,"not_found","Matter not found");return listMatterDrafts(db,companyId,matterId);});
  return NextResponse.json({drafts});
});
export const POST=handle(async (request:Request,{params}:Context)=>{
  const user=await requireUser();const {companyId,matterId}=await params;const company=await resolveCompanyForActor(companyId,user.id);
  if(company.role==="reviewer")throw new ApiError(403,"forbidden","Reviewer cannot create drafts");
  const input=await parseBody(request,z.object({body:z.string().max(50000).optional()}));
  const draft=await asActor(user.id,async db=>{
    const matter=await getMatter(db,companyId,matterId);if(!matter)throw new ApiError(404,"not_found","Matter not found");
    const body=input.body?.trim()||draftOutline(matter,company.company.name);
    return createMatterDraft(db,companyId,matterId,body,user.id);
  });
  return NextResponse.json({draft},{status:201});
});
