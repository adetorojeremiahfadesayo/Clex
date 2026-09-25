import { NextResponse } from "next/server";
import { z } from "zod";
import { setMatterActionStatus } from "@lex/db";
import { ApiError, handle, parseBody, requireUser } from "@/lib/api";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";
type Context={params:Promise<{companyId:string;matterId:string;actionId:string}>};
export const PATCH=handle(async (request:Request,{params}:Context)=>{
  const user=await requireUser();const {companyId,matterId,actionId}=await params;const company=await resolveCompanyForActor(companyId,user.id);
  if(company.role==="reviewer")throw new ApiError(403,"forbidden","Reviewer cannot change actions");
  const input=await parseBody(request,z.object({status:z.enum(["open","done"])}));
  const ok=await asActor(user.id,db=>setMatterActionStatus(db,companyId,matterId,actionId,input.status));
  if(!ok)throw new ApiError(404,"not_found","Action not found");
  return NextResponse.json({status:input.status});
});
