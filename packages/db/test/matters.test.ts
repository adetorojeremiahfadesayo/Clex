import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { withActor } from "../src/tenant";
import { createGuestUser } from "../src/repositories/users";
import { createCompanyWithOwner } from "../src/repositories/companies";
import { createMatter, createMatterAnalysis, createMatterDocument, createMatterDraft, createMatterAction, deleteMatterDocument, getMatter, getMatterDocument, listMatterAnalyses, listMatterDocuments, listMatterDrafts, listMatterActions, listMatters } from "../src/repositories/matters";
import { hasDb, makeTenant, pools } from "./helpers";

describe.skipIf(!hasDb)("M3/M4 private matter workflow",()=>{
  const p=pools();let a:Awaited<ReturnType<typeof makeTenant>>;let b:Awaited<ReturnType<typeof makeTenant>>;
  beforeAll(async()=>{a=await makeTenant(p.app,"matter-a");b=await makeTenant(p.app,"matter-b");});
  afterAll(async()=>{await Promise.all([p.admin.end(),p.app.end(),p.worker.end()]);});

  it("automatically created browser identities have separate tenant workspaces",async()=>{
    const guest=await withActor(p.app,null,createGuestUser);
    expect(guest.email).toMatch(/^guest-.+@local\.invalid$/);
    const company=await withActor(p.app,guest.id,db=>createCompanyWithOwner(db,{name:"Guest Studio",lifecycleStage:"idea"}));
    expect(await withActor(p.app,a.user.id,db=>getMatter(db,company.id,"00000000-0000-0000-0000-000000000000"))).toBeNull();
  });

  it("stores a document, contextual analysis, draft and action with RLS; deletion removes derived content",async()=>{
    const matter=await withActor(p.app,a.user.id,db=>createMatter(db,a.company.id,a.user.id,{kind:"supplier",title:"Hosting supplier",summary:"Review hosting terms",context:{deliverables:"Cloud hosting",payment:"Monthly"}},null));
    const bytes=Buffer.from("Supplier agreement. Payment due monthly. Termination after 30 days notice.");
    const sha256=createHash("sha256").update(bytes).digest("hex");
    const doc=await withActor(p.app,a.user.id,db=>createMatterDocument(db,{companyId:a.company.id,matterId:matter.id,filename:"supplier.txt",mimeType:"text/plain",bytes,sha256,extractedText:bytes.toString(),extractionStatus:"readable",actorId:a.user.id}));
    const analysis=await withActor(p.app,a.user.id,db=>createMatterAnalysis(db,{companyId:a.company.id,matterId:matter.id,documentId:doc.id,profileRevisionId:null,mode:"preparation",status:"needs_review",findings:[{kind:"suggestion",title:"Check payment",explanation:"Compare terms",companyReason:"Monthly payment intended",documentExcerpt:"Payment due monthly",sourceType:"document"}],questions:["Which currency?"],actorId:a.user.id}));
    const draft=await withActor(p.app,a.user.id,db=>createMatterDraft(db,a.company.id,matter.id,"Working outline",a.user.id));
    const action=await withActor(p.app,a.user.id,db=>createMatterAction(db,a.company.id,matter.id,"Ask lawyer about payment",a.user.id));
    expect(analysis.findings[0]?.documentExcerpt).toBe("Payment due monthly");
    expect(draft.version).toBe(1);expect(action.status).toBe("open");
    expect(await withActor(p.app,b.user.id,db=>getMatter(db,a.company.id,matter.id))).toBeNull();
    expect(await withActor(p.app,b.user.id,db=>listMatters(db,a.company.id))).toEqual([]);
    expect(await withActor(p.app,b.user.id,db=>listMatterDocuments(db,a.company.id,matter.id))).toEqual([]);
    expect(await withActor(p.app,b.user.id,db=>getMatterDocument(db,a.company.id,doc.id))).toBeNull();
    await expect(withActor(p.app,b.user.id,db=>createMatterDraft(db,a.company.id,matter.id,"stolen",b.user.id))).rejects.toThrow();
    expect(await withActor(p.app,a.user.id,db=>listMatterActions(db,a.company.id,matter.id))).toHaveLength(1);
    expect(await withActor(p.app,a.user.id,db=>deleteMatterDocument(db,a.company.id,doc.id))).toBe(true);
    expect(await withActor(p.app,a.user.id,db=>listMatterAnalyses(db,a.company.id,matter.id))).toEqual([]);
    expect(await withActor(p.app,a.user.id,db=>listMatterDrafts(db,a.company.id,matter.id))).toEqual([]);
    expect(await withActor(p.app,a.user.id,db=>getMatterDocument(db,a.company.id,doc.id))).toBeNull();
  });
});
