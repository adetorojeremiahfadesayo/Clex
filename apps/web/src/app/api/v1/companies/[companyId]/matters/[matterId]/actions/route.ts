import { NextResponse } from "next/server";
import { z } from "zod";
import { createMatterAction, getMatter, listMatterActions } from "@lex/db";
import { ApiError, handle, parseBody, requireUser } from "@/lib/api";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";
type Context={params:Promise<{companyId:string;matterId:string}>};
export const GET=handle(async (_request:Request,{params}:Context)=>{
  const user=await requireUser();const {companyId,matterId}=await params;await resolveCompanyForActor(companyId,user.id);
  const actions=await asActor(user.id,async db=>{if(!await getMatter(db,companyId,matterId))throw new ApiError(404,"not_found","Matter not found");return listMatterActions(db,companyId,matterId);});
  return NextResponse.json({actions});
});
export const POST=handle(async (request:Request,{params}:Context)=>{
  const user=await requireUser();const {companyId,matterId}=await params;const company=await resolveCompanyForActor(companyId,user.id);
  if(company.role==="reviewer")throw new ApiError(403,"forbidden","Reviewer cannot add actions");
  const input=await parseBody(request,z.object({text:z.string().trim().min(2).max(1000)}));
  const action=await asActor(user.id,async db=>{if(!await getMatter(db,companyId,matterId))throw new ApiError(404,"not_found","Matter not found");return createMatterAction(db,companyId,matterId,input.text,user.id);});
  return NextResponse.json({action},{status:201});
});
