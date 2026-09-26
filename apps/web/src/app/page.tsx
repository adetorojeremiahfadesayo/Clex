import Link from "next/link";
import { redirect } from "next/navigation";
import { lifecycleStageLabels } from "@lex/domain";
import { listCompanies } from "@lex/db";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { StartDemoButton } from "@/components/start-demo-button";
import { Clexa } from "@/components/clexa";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/");
  const companies = await asActor(user.id, (db) => listCompanies(db));

  return <section className="space-y-12">
    <div id="demo" className="clex-hero">
      <div className="clex-hero-copy">
        <span className="clex-hero-kicker">Meet Clex · with Clexa by your side</span>
        <h1 className="clex-hero-title">Your company, <em>clearly prepared.</em></h1>
        <p className="clex-hero-sub">From the first registration question to the contract on your desk, Clex turns your company facts into a practical path and a clearer handoff to your lawyer.</p>
        <div className="clex-hero-actions"><StartDemoButton /><Link href="/companies/new" className="clex-hero-secondary">Start with my company →</Link></div>
        <div className="clex-hero-proof"><span>No account needed</span><span>Private browser workspace</span><span>Preparation, clearly labelled</span></div>
      </div>
      <div className="clex-scene" aria-hidden="true">
        <div className="clex-scene-orbit" />
        <div className="clex-scene-sheet clex-scene-sheet-back"><span className="clex-scene-tag">Company profile</span><div className="clex-scene-heading">The facts behind the advice</div><div className="clex-scene-rule" /><div className="clex-scene-rule mid" /><div className="clex-scene-rule short" /></div>
        <div className="clex-scene-sheet clex-scene-sheet-front"><span className="clex-scene-tag">Supplier review · sample</span><div className="clex-scene-heading">Before you sign, see what changed.</div><div className="clex-scene-rule mid" /><div className="clex-scene-highlight">Your plan: pay in 30 days.<br />Sample agreement: pay in 7 days.</div><div className="clex-scene-rule short" /></div>
        <Clexa className="clex-scene-character" decorative />
        <div className="clex-scene-badge">Clexa found a question to raise with counsel ✦</div>
      </div>
    </div>

    <div>
      <div className="clex-section-head"><div><p className="eyebrow">One connected journey</p><h2 className="clex-section-title">Start well. Stay ready.</h2></div><p className="clex-section-caption">Clexa guides the steps, while your confirmed company facts shape what appears next. Nothing is treated as legally verified just because it was entered.</p></div>
      <ol className="clex-journey">
        <li className="clex-journey-step"><span className="clex-journey-index">01</span><h3>Tell Clex about the business</h3><p>Formation market, registration stage, work, people, and what is still unknown.</p></li>
        <li className="clex-journey-step"><span className="clex-journey-index">02</span><h3>See the starting path</h3><p>Get a checklist with reasons linked to those answers and official directory pointers where available.</p></li>
        <li className="clex-journey-step"><span className="clex-journey-index">03</span><h3>Prepare the next decision</h3><p>Bring a hiring or supplier matter, review document excerpts, and leave with a packet for counsel.</p></li>
      </ol>
    </div>

    <div>
      <div className="clex-section-head"><div><p className="eyebrow">Your workspace</p><h2 className="clex-section-title">Your companies</h2></div><p className="clex-section-caption">{companies.length} {companies.length === 1 ? "company" : "companies"} in this browser</p></div>
      {companies.length === 0 ? <div className="clex-empty">You have no companies yet. Try the synthetic demo above or <Link href="/companies/new" className="font-semibold underline">add your company</Link>.</div> :
        <ul className="clex-company-list">{companies.map((c) => <li key={c.id}><Link href={`/companies/${c.id}/overview`} className="clex-company-card"><h3>{c.name}</h3><p className="mt-2">{lifecycleStageLabels[c.lifecycleStage]}</p><span className="clex-company-arrow">Open company workspace →</span></Link></li>)}</ul>}
    </div>
    <p className="clex-privacy">Each browser receives a private workspace automatically. Keep this browser’s cookies to retain access; account recovery is not part of this hackathon preview. The demo uses synthetic facts and local preparation, not lawyer-approved legal guidance.</p>
  </section>;
}
