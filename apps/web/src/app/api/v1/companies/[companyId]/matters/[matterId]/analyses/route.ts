import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentRevision, getMatter, getMatterDocument, listMatterAnalyses, createMatterAnalysis } from "@lex/db";
import { ApiError, handle, parseBody, requireUser } from "@/lib/api";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";
import { env } from "@/lib/env";
import { analyseMatter } from "@/lib/matter-analysis";

type Context={params:Promise<{companyId:string;matterId:string}>};
const inputSchema=z.object({documentId:z.uuid().nullable().default(null),allowExternalProcessing:z.boolean().default(false)});
export const GET=handle(async (_request:Request,{params}:Context)=>{
  const user=await requireUser();const {companyId,matterId}=await params;await resolveCompanyForActor(companyId,user.id);
  const analyses=await asActor(user.id,async db=>{if(!await getMatter(db,companyId,matterId))throw new ApiError(404,"not_found","Matter not found");return listMatterAnalyses(db,companyId,matterId);});
  return NextResponse.json({analyses});
});
export const POST=handle(async (request:Request,{params}:Context)=>{
  const user=await requireUser();const {companyId,matterId}=await params;
  const company=await resolveCompanyForActor(companyId,user.id);
  if(company.role==="reviewer")throw new ApiError(403,"forbidden","Reviewer cannot run analysis");
  const input=await parseBody(request,inputSchema);
  const config=env();const isLive=config.LLM_PROVIDER!=="none"&&!!config.LLM_API_KEY&&!!config.LLM_MODEL;
  if(isLive&&!input.allowExternalProcessing)throw new ApiError(422,"consent_required","Confirm external model processing before running a live analysis");
  const data=await asActor(user.id,async db=>{
    const matter=await getMatter(db,companyId,matterId);if(!matter)throw new ApiError(404,"not_found","Matter not found");
    const revision=await getCurrentRevision(db,companyId);
    const document=input.documentId?await getMatterDocument(db,companyId,input.documentId):null;
    if(input.documentId&&(!document||document.matterId!==matterId))throw new ApiError(404,"not_found","Document not found");
    return {matter,revision,document};
  });
  let output:Awaited<ReturnType<typeof analyseMatter>>;
  try{output=await analyseMatter(data.matter,data.revision?.facts??{},data.document,config);}
  catch(error){
    const failure=await asActor(user.id,db=>createMatterAnalysis(db,{companyId,matterId,documentId:data.document?.id??null,profileRevisionId:data.revision?.id??null,mode:isLive?"live":"preparation",status:"failed",findings:[],questions:[],errorMessage:error instanceof Error?error.message.slice(0,300):"Analysis failed",provider:isLive?config.LLM_PROVIDER:undefined,model:isLive?config.LLM_MODEL:undefined,actorId:user.id}));
    return NextResponse.json({analysis:failure,error:{code:"analysis_failed",message:"Analysis failed; the inputs were retained. Retry later."}},{status:503});
  }
  const analysis=await asActor(user.id,async db=>{
    if(!await getMatter(db,companyId,matterId))throw new ApiError(409,"matter_changed","Matter no longer exists");
    if(data.document&&!await getMatterDocument(db,companyId,data.document.id))throw new ApiError(409,"document_changed","Document was removed during analysis");
    return createMatterAnalysis(db,{companyId,matterId,documentId:data.document?.id??null,profileRevisionId:data.revision?.id??null,mode:output.mode,status:"needs_review",findings:output.findings,questions:output.questions,provider:output.mode==="live"?config.LLM_PROVIDER:undefined,model:output.mode==="live"?config.LLM_MODEL:undefined,actorId:user.id});
  });
  return NextResponse.json({analysis},{status:201});
});
