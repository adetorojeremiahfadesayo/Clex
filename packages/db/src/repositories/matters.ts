import { analysisOutputSchema, type CreateMatterInput, type Finding } from "@lex/domain";
import type { Queryable } from "../pool";

export interface Matter {
  id: string; companyId: string; kind: CreateMatterInput["kind"]; title: string;
  summary: string; context: CreateMatterInput["context"]; profileRevisionId: string | null;
  status: "open" | "needs_review" | "closed"; createdAt: string;
}
interface MatterRow { id: string; company_id: string; kind: Matter["kind"]; title: string; summary: string; context: Matter["context"]; profile_revision_id: string | null; status: Matter["status"]; created_at: Date }
const matterCols = "id, company_id, kind, title, summary, context, profile_revision_id, status, created_at";
const toMatter = (r: MatterRow): Matter => ({ id: r.id, companyId: r.company_id, kind: r.kind, title: r.title, summary: r.summary, context: r.context, profileRevisionId: r.profile_revision_id, status: r.status, createdAt: r.created_at.toISOString() });

export async function createMatter(db: Queryable, companyId: string, actorId: string, input: CreateMatterInput, profileRevisionId: string | null): Promise<Matter> {
  const { rows } = await db.query<MatterRow>(`insert into matters (company_id, kind, title, summary, context, profile_revision_id, created_by) values ($1,$2,$3,$4,$5,$6,$7) returning ${matterCols}`, [companyId, input.kind, input.title, input.summary, JSON.stringify(input.context), profileRevisionId, actorId]);
  return toMatter(rows[0]!);
}
export async function listMatters(db: Queryable, companyId: string): Promise<Matter[]> {
  const { rows } = await db.query<MatterRow>(`select ${matterCols} from matters where company_id=$1 order by created_at desc`, [companyId]);
  return rows.map(toMatter);
}
export async function getMatter(db: Queryable, companyId: string, matterId: string): Promise<Matter | null> {
  const { rows } = await db.query<MatterRow>(`select ${matterCols} from matters where company_id=$1 and id=$2`, [companyId, matterId]);
  return rows[0] ? toMatter(rows[0]) : null;
}

export interface MatterDocument { id: string; companyId: string; matterId: string; filename: string; mimeType: string; byteSize: number; sha256: string; extractedText: string; extractionStatus: "readable" | "ocr_required" | "failed"; createdAt: string }
interface DocumentRow { id: string; company_id: string; matter_id: string; filename: string; mime_type: string; byte_size: number; sha256: string; extracted_text: string; extraction_status: MatterDocument["extractionStatus"]; created_at: Date; original_bytes?: Buffer }
const documentCols = "id, company_id, matter_id, filename, mime_type, byte_size, sha256, extracted_text, extraction_status, created_at";
const toDocument = (r: DocumentRow): MatterDocument => ({ id:r.id, companyId:r.company_id, matterId:r.matter_id, filename:r.filename, mimeType:r.mime_type, byteSize:r.byte_size, sha256:r.sha256, extractedText:r.extracted_text, extractionStatus:r.extraction_status, createdAt:r.created_at.toISOString() });
export async function createMatterDocument(db: Queryable, input: { companyId:string; matterId:string; filename:string; mimeType:string; bytes:Buffer; sha256:string; extractedText:string; extractionStatus:MatterDocument["extractionStatus"]; actorId:string }): Promise<MatterDocument> {
  const { rows } = await db.query<DocumentRow>(`insert into matter_documents (company_id,matter_id,filename,mime_type,byte_size,sha256,original_bytes,extracted_text,extraction_status,created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning ${documentCols}`, [input.companyId,input.matterId,input.filename,input.mimeType,input.bytes.length,input.sha256,input.bytes,input.extractedText,input.extractionStatus,input.actorId]);
  return toDocument(rows[0]!);
}
export async function listMatterDocuments(db: Queryable, companyId:string, matterId:string): Promise<MatterDocument[]> {
  const { rows } = await db.query<DocumentRow>(`select ${documentCols} from matter_documents where company_id=$1 and matter_id=$2 order by created_at desc`,[companyId,matterId]);
  return rows.map(toDocument);
}
export async function getMatterDocument(db: Queryable, companyId:string, documentId:string): Promise<(MatterDocument & { bytes:Buffer }) | null> {
  const { rows } = await db.query<DocumentRow>(`select ${documentCols}, original_bytes from matter_documents where company_id=$1 and id=$2`,[companyId,documentId]);
  return rows[0] && rows[0].original_bytes ? { ...toDocument(rows[0]), bytes: rows[0].original_bytes } : null;
}
export async function deleteMatterDocument(db: Queryable, companyId:string, documentId:string): Promise<boolean> {
  const document=await getMatterDocument(db,companyId,documentId);
  if(!document)return false;
  // An analysis can depend on several files even though it stores one primary document id.
  // Remove every derived result when any source is removed, so deleted conversation text
  // cannot survive in findings, drafts, or saved chat turns.
  await db.query(`delete from matter_analyses where company_id=$1 and matter_id=$2`,[companyId,document.matterId]);
  await db.query(`delete from matter_drafts where company_id=$1 and matter_id=$2`,[companyId,document.matterId]);
  await db.query(`delete from matter_chat_messages where company_id=$1 and matter_id=$2`,[companyId,document.matterId]);
  const { rowCount } = await db.query(`delete from matter_documents where company_id=$1 and id=$2`,[companyId,documentId]);
  return (rowCount ?? 0) > 0;
}

export interface MatterAnalysis { id:string; documentId:string|null; profileRevisionId:string|null; mode:"preparation"|"live"; status:"completed"|"needs_review"|"failed"; findings:Finding[]; questions:string[]; errorMessage:string|null; provider:string|null; model:string|null; createdAt:string }
interface AnalysisRow { id:string; document_id:string|null; profile_revision_id:string|null; mode:MatterAnalysis["mode"]; status:MatterAnalysis["status"]; findings:unknown; questions:unknown; error_message:string|null; provider:string|null; model:string|null; created_at:Date }
const toAnalysis = (r:AnalysisRow):MatterAnalysis => { const output=analysisOutputSchema.parse({findings:r.findings, questions:r.questions}); return {id:r.id,documentId:r.document_id,profileRevisionId:r.profile_revision_id,mode:r.mode,status:r.status,...output,errorMessage:r.error_message,provider:r.provider,model:r.model,createdAt:r.created_at.toISOString()}; };
export async function createMatterAnalysis(db:Queryable,input:{companyId:string;matterId:string;documentId:string|null;profileRevisionId:string|null;mode:MatterAnalysis["mode"];status:MatterAnalysis["status"];findings:Finding[];questions:string[];errorMessage?:string|undefined;provider?:string|undefined;model?:string|undefined;actorId:string}):Promise<MatterAnalysis> {
  const { rows }=await db.query<AnalysisRow>(`insert into matter_analyses(company_id,matter_id,document_id,profile_revision_id,mode,status,findings,questions,error_message,provider,model,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id,document_id,profile_revision_id,mode,status,findings,questions,error_message,provider,model,created_at`,[input.companyId,input.matterId,input.documentId,input.profileRevisionId,input.mode,input.status,JSON.stringify(input.findings),JSON.stringify(input.questions),input.errorMessage??null,input.provider??null,input.model??null,input.actorId]);
  return toAnalysis(rows[0]!);
}
export async function listMatterAnalyses(db:Queryable,companyId:string,matterId:string):Promise<MatterAnalysis[]> {
  const { rows }=await db.query<AnalysisRow>(`select id,document_id,profile_revision_id,mode,status,findings,questions,error_message,provider,model,created_at from matter_analyses where company_id=$1 and matter_id=$2 order by created_at desc`,[companyId,matterId]);
  return rows.map(toAnalysis);
}

export interface MatterChatMessage { id:string; role:"user"|"assistant"; body:string; findings:Finding[]; questions:string[]; mode:"preparation"|"live"|null; draftVersion:number|null; createdAt:string }
interface ChatMessageRow { id:string; role:MatterChatMessage["role"]; body:string; findings:unknown; questions:unknown; mode:MatterChatMessage["mode"]; draft_version:number|null; created_at:Date }
const toChatMessage=(r:ChatMessageRow):MatterChatMessage=>({id:r.id,role:r.role,body:r.body,...analysisOutputSchema.parse({findings:r.findings,questions:r.questions}),mode:r.mode,draftVersion:r.draft_version,createdAt:r.created_at.toISOString()});
export async function createMatterChatMessage(db:Queryable,input:{companyId:string;matterId:string;role:MatterChatMessage["role"];body:string;findings?:Finding[]|undefined;questions?:string[]|undefined;mode?:MatterChatMessage["mode"]|undefined;draftVersion?:number|null|undefined;actorId:string}):Promise<MatterChatMessage>{
  const body=input.body.trim().slice(0,4000);
  if(!body)throw new Error("Chat message cannot be empty");
  const {rows}=await db.query<ChatMessageRow>(`insert into matter_chat_messages(company_id,matter_id,role,body,findings,questions,mode,draft_version,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id,role,body,findings,questions,mode,draft_version,created_at`,[input.companyId,input.matterId,input.role,body,JSON.stringify(input.findings??[]),JSON.stringify(input.questions??[]),input.mode??null,input.draftVersion??null,input.actorId]);
  return toChatMessage(rows[0]!);
}
export async function listMatterChatMessages(db:Queryable,companyId:string,matterId:string):Promise<MatterChatMessage[]>{
  const {rows}=await db.query<ChatMessageRow>(`select id,role,body,findings,questions,mode,draft_version,created_at from (select id,role,body,findings,questions,mode,draft_version,created_at from matter_chat_messages where company_id=$1 and matter_id=$2 order by created_at desc,id desc limit 80) recent order by created_at,id`,[companyId,matterId]);
  return rows.map(toChatMessage);
}

export interface MatterDraft { id:string; version:number; body:string; status:"unreviewed"|"review_requested"; createdAt:string }
interface DraftRow { id:string; version:number; body:string; status:MatterDraft["status"]; created_at:Date }
export async function createMatterDraft(db:Queryable,companyId:string,matterId:string,body:string,actorId:string):Promise<MatterDraft> {
  await db.query(`select id from matters where company_id=$1 and id=$2 for update`,[companyId,matterId]);
  const { rows }=await db.query<DraftRow>(`insert into matter_drafts(company_id,matter_id,version,body,created_by) values($1,$2,(select coalesce(max(version),0)+1 from matter_drafts where matter_id=$2),$3,$4) returning id,version,body,status,created_at`,[companyId,matterId,body,actorId]);
  const r=rows[0]!; return {id:r.id,version:r.version,body:r.body,status:r.status,createdAt:r.created_at.toISOString()};
}
export async function listMatterDrafts(db:Queryable,companyId:string,matterId:string):Promise<MatterDraft[]> {
  const { rows }=await db.query<DraftRow>(`select id,version,body,status,created_at from matter_drafts where company_id=$1 and matter_id=$2 order by version desc`,[companyId,matterId]);
  return rows.map(r=>({id:r.id,version:r.version,body:r.body,status:r.status,createdAt:r.created_at.toISOString()}));
}
export async function requestDraftReview(db:Queryable,companyId:string,draftId:string):Promise<boolean> {
  const {rowCount}=await db.query(`update matter_drafts set status='review_requested' where company_id=$1 and id=$2`,[companyId,draftId]);return (rowCount??0)>0;
}

export interface MatterAction { id:string; text:string; status:"open"|"done"; createdAt:string }
interface ActionRow { id:string; text:string; status:MatterAction["status"]; created_at:Date }
export async function createMatterAction(db:Queryable,companyId:string,matterId:string,text:string,actorId:string):Promise<MatterAction> {
  const {rows}=await db.query<ActionRow>(`insert into matter_actions(company_id,matter_id,text,created_by) values($1,$2,$3,$4) returning id,text,status,created_at`,[companyId,matterId,text,actorId]);const r=rows[0]!;return{id:r.id,text:r.text,status:r.status,createdAt:r.created_at.toISOString()};
}
export async function listMatterActions(db:Queryable,companyId:string,matterId:string):Promise<MatterAction[]> {
  const {rows}=await db.query<ActionRow>(`select id,text,status,created_at from matter_actions where company_id=$1 and matter_id=$2 order by created_at desc`,[companyId,matterId]);return rows.map(r=>({id:r.id,text:r.text,status:r.status,createdAt:r.created_at.toISOString()}));
}
export async function setMatterActionStatus(db:Queryable,companyId:string,matterId:string,actionId:string,status:MatterAction["status"]):Promise<boolean> {
  const {rowCount}=await db.query(`update matter_actions set status=$4 where company_id=$1 and matter_id=$2 and id=$3`,[companyId,matterId,actionId,status]);return(rowCount??0)>0;
}
