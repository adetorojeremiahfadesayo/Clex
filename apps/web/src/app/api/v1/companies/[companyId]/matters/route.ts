import { NextResponse } from "next/server";
import { createMatterSchema, uuidSchema } from "@lex/domain";
import { createMatter, getCurrentRevision, listMatters } from "@lex/db";
import { ApiError, handle, parseBody, requireUser } from "@/lib/api";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";

type Context={params:Promise<{companyId:string}>};
export const GET=handle(async (_request:Request,{params}:Context)=>{
  const user=await requireUser();const {companyId}=await params;
  await resolveCompanyForActor(companyId,user.id);
  return NextResponse.json({matters:await asActor(user.id,db=>listMatters(db,companyId))});
});
export const POST=handle(async (request:Request,{params}:Context)=>{
  const user=await requireUser();const {companyId}=await params;
  if(!uuidSchema.safeParse(companyId).success) throw new ApiError(404,"not_found","Company not found");
  const company=await resolveCompanyForActor(companyId,user.id);
  if(company.role==="reviewer") throw new ApiError(403,"forbidden","Reviewer cannot create matters");
  const input=await parseBody(request,createMatterSchema);
  const matter=await asActor(user.id,async db=>{
    const revision=await getCurrentRevision(db,companyId);
    return createMatter(db,companyId,user.id,input,revision?.id??null);
  });
  return NextResponse.json({matter},{status:201});
});
