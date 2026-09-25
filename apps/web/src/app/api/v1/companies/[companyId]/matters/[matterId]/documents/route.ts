import { NextResponse } from "next/server";
import { createMatterDocument, getMatter, listMatterDocuments } from "@lex/db";
import { ApiError, handle, requireUser } from "@/lib/api";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";
import { extractUpload } from "@/lib/documents";

type Context={params:Promise<{companyId:string;matterId:string}>};
export const GET=handle(async (_request:Request,{params}:Context)=>{
  const user=await requireUser();const {companyId,matterId}=await params;
  await resolveCompanyForActor(companyId,user.id);
  const documents=await asActor(user.id,async db=>{
    if(!await getMatter(db,companyId,matterId)) throw new ApiError(404,"not_found","Matter not found");
    return listMatterDocuments(db,companyId,matterId);
  });
  return NextResponse.json({documents});
});
export const POST=handle(async (request:Request,{params}:Context)=>{
  const user=await requireUser();const {companyId,matterId}=await params;
  const company=await resolveCompanyForActor(companyId,user.id);
  if(company.role==="reviewer") throw new ApiError(403,"forbidden","Reviewer cannot upload files");
  const form=await request.formData();const file=form.get("file");
  if(!(file instanceof File)) throw new ApiError(422,"file_required","Choose a file");
  const parsed=await extractUpload(file);
  const document=await asActor(user.id,async db=>{
    if(!await getMatter(db,companyId,matterId)) throw new ApiError(404,"not_found","Matter not found");
    return createMatterDocument(db,{companyId,matterId,actorId:user.id,...parsed});
  });
  return NextResponse.json({document:{...document,extractedText:document.extractedText.slice(0,2000)}},{status:201});
});
