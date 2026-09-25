import { getMatterDocument, deleteMatterDocument } from "@lex/db";
import { ApiError, handle, requireUser } from "@/lib/api";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";

type Context={params:Promise<{companyId:string;matterId:string;documentId:string}>};
export const GET=handle(async (_request:Request,{params}:Context)=>{
  const user=await requireUser();const {companyId,matterId,documentId}=await params;await resolveCompanyForActor(companyId,user.id);
  const document=await asActor(user.id,db=>getMatterDocument(db,companyId,documentId));
  if(!document||document.matterId!==matterId)throw new ApiError(404,"not_found","Document not found");
  return new Response(new Uint8Array(document.bytes),{headers:{"Content-Type":document.mimeType,"Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(document.filename)}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
});
export const DELETE=handle(async (_request:Request,{params}:Context)=>{
  const user=await requireUser();const {companyId,matterId,documentId}=await params;const company=await resolveCompanyForActor(companyId,user.id);
  if(company.role==="reviewer")throw new ApiError(403,"forbidden","Reviewer cannot delete files");
  const ok=await asActor(user.id,async db=>{const document=await getMatterDocument(db,companyId,documentId);if(!document||document.matterId!==matterId)return false;return deleteMatterDocument(db,companyId,documentId);});
  if(!ok)throw new ApiError(404,"not_found","Document not found");
  return new Response(null,{status:204});
});
