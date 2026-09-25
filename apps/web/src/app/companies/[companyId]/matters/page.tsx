import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listMatters } from "@lex/db";
import { uuidSchema } from "@lex/domain";
import { MatterCreateForm } from "@/components/matter-create-form";
import { resolveCompanyForActor } from "@/lib/authz";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic="force-dynamic";
export default async function MattersPage({params}:{params:Promise<{companyId:string}>}){
  const user=await currentUser();if(!user)redirect("/api/guest?next=/");const {companyId}=await params;
  if(!uuidSchema.safeParse(companyId).success)notFound();
  const {company,role}=await resolveCompanyForActor(companyId,user.id);
  const matters=await asActor(user.id,db=>listMatters(db,companyId));
  return <section className="space-y-7"><nav className="text-sm text-slate-500"><Link href="/" className="underline">Companies</Link> / <Link href={`/companies/${companyId}/overview`} className="underline">{company.name}</Link> / Matters</nav>
    <header><span className="eyebrow">Company counsel / matters</span><h1 className="mt-2 text-3xl font-semibold">Work that moves with your company</h1><p className="mt-2 max-w-2xl text-slate-600">Keep agreements, questions, drafts and action items together with the profile that explains your business.</p></header>
    {role!=="reviewer"&&<MatterCreateForm companyId={companyId}/>}
    <div><h2 className="mb-3 text-lg font-semibold">Existing matters <span className="text-slate-400">{matters.length}</span></h2>{matters.length? <ul className="grid gap-3 md:grid-cols-2">{matters.map(m=><li key={m.id}><Link href={`/companies/${companyId}/matters/${m.id}`} className="card block p-5 transition hover:border-blue-300 hover:shadow-sm"><span className="eyebrow">{m.kind}</span><h3 className="mt-2 font-semibold">{m.title}</h3><p className="mt-1 line-clamp-2 text-sm text-slate-600">{m.summary||"No summary yet"}</p><p className="mt-3 text-xs text-slate-500">{new Date(m.createdAt).toLocaleDateString()} · {m.status.replaceAll("_"," ")}</p></Link></li>)}</ul>:<p className="card p-5 text-sm text-slate-600">No matters yet. Start with a hiring, supplier or other business question above.</p>}</div>
  </section>;
}
