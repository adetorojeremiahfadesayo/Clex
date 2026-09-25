"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MatterKind } from "@lex/domain";

const choices:{kind:MatterKind;title:string;description:string}[]=[
  {kind:"employment",title:"People & hiring",description:"Prepare an employment or contractor agreement, or review one you already have."},
  {kind:"supplier",title:"Suppliers & partners",description:"Check a commercial agreement against the deal your company actually intends."},
  {kind:"other",title:"Another legal question",description:"Organise meeting notes, a decision, or a document for your adviser."},
];
export function MatterCreateForm({companyId}:{companyId:string}){
  const router=useRouter();const [kind,setKind]=useState<MatterKind>("employment");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");const form=new FormData(event.currentTarget);
    const context=Object.fromEntries(["role","counterparty","workLocation","governingLaw","payment","dataAccess","deliverables","question"].map(k=>[k,String(form.get(k)||"").trim()]).filter(([,v])=>v));
    try{const response=await fetch(`/api/v1/companies/${companyId}/matters`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,title:form.get("title"),summary:form.get("summary"),context})});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Could not create matter");router.push(`/companies/${companyId}/matters/${data.matter.id}`);router.refresh();}
    catch(e){setError(e instanceof Error?e.message:"Could not create matter");setBusy(false);}
  }
  return <form onSubmit={submit} className="card space-y-5 p-6">
    <div><h2 className="text-lg font-semibold">Start a matter</h2><p className="mt-1 text-sm text-slate-600">Choose the work, then add the details you know. You can continue with unknowns.</p></div>
    <fieldset className="grid gap-3 md:grid-cols-3"><legend className="sr-only">Matter type</legend>{choices.map(c=><label key={c.kind} className={`cursor-pointer rounded-xl border p-4 text-sm ${kind===c.kind?"border-[var(--accent)] bg-blue-50":"border-slate-200 bg-white"}`}><input className="sr-only" type="radio" name="kind" value={c.kind} checked={kind===c.kind} onChange={()=>setKind(c.kind)}/><strong className="block">{c.title}</strong><span className="mt-1 block text-slate-600">{c.description}</span></label>)}</fieldset>
    <label className="block text-sm font-medium">Matter name<input name="title" required maxLength={200} placeholder={kind==="employment"?"e.g. First product engineer agreement":kind==="supplier"?"e.g. Cloud hosting supplier":"e.g. Board meeting decision"} className="field mt-1"/></label>
    <label className="block text-sm font-medium">What are you trying to do?<textarea name="summary" rows={3} maxLength={4000} className="field mt-1" placeholder="Add the practical goal, concerns, or background."/></label>
    {kind==="employment"&&<div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Role / duties<input name="role" className="field mt-1" placeholder="Product engineer"/></label><label className="text-sm font-medium">Where they work<input name="workLocation" className="field mt-1" placeholder="Country and state / region"/></label><label className="text-sm font-medium">Pay and schedule<input name="payment" className="field mt-1" placeholder="Amount, currency, frequency"/></label><label className="text-sm font-medium">Person / counterparty<input name="counterparty" className="field mt-1" placeholder="Can be left blank"/></label></div>}
    {kind==="supplier"&&<div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Supplier / counterparty<input name="counterparty" className="field mt-1"/></label><label className="text-sm font-medium">What they deliver<input name="deliverables" className="field mt-1"/></label><label className="text-sm font-medium">Payment terms<input name="payment" className="field mt-1"/></label><label className="text-sm font-medium">Data or confidential access<input name="dataAccess" className="field mt-1"/></label></div>}
    {kind==="other"&&<label className="block text-sm font-medium">Question for an adviser<textarea name="question" rows={3} className="field mt-1" placeholder="What decision, document, or issue needs attention?"/></label>}
    <label className="block text-sm font-medium">Expected governing law, if known<input name="governingLaw" className="field mt-1" placeholder="Leave blank if unsure"/></label>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="button-primary">{busy?"Creating…":"Create matter"}</button>
  </form>;
}
