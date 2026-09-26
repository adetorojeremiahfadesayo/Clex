import Link from "next/link";
import { redirect } from "next/navigation";
import { lifecycleStageLabels } from "@lex/domain";
import { listCompanies } from "@lex/db";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { Clexa } from "@/components/clexa";
import { demoCompany } from "@/lib/demo-answers";
import { createCompanyAction } from "@/app/companies/new/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/");
  const companies = await asActor(user.id, (db) => listCompanies(db));

  return <section className="space-y-12">
    <div id="try" className="clex-hero">
      <div className="clex-hero-copy">
        <span className="clex-hero-kicker">Meet Clex, with Clexa by your side</span>
        <h1 className="clex-hero-title">Your company, <em>clearly prepared.</em></h1>
        <p className="clex-hero-sub">From the first registration question to the contract on your desk, Clex turns your company facts into a practical path and a clearer handoff to your lawyer.</p>
        <div className="clex-hero-actions">
          <Link href="/companies/new" className="clex-hero-primary">Try it out →</Link>
          <form action={createCompanyAction}>
            <input type="hidden" name="demo" value="1" />
            <input type="hidden" name="name" value={demoCompany.name} />
            <input type="hidden" name="lifecycleStage" value={demoCompany.lifecycleStage} />
            <button type="submit" className="clex-hero-secondary">Click demo answers</button>
          </form>
          <p className="clex-hero-hint">For judges, about 60 seconds: pick the suggested answers, tick off the checklist, then check a sample contract. It all happens on one page.</p>
        </div>
        <div className="clex-hero-proof"><span>No account needed</span><span>Private browser workspace</span><span>Preparation, clearly labelled</span></div>
      </div>
      <div className="clex-scene" aria-hidden="true">
        <div className="clex-scene-sheet clex-scene-sheet-back"><span className="clex-scene-tag">Company profile</span><div className="clex-scene-heading">The facts behind the advice</div><div className="clex-scene-rule" /><div className="clex-scene-rule mid" /><div className="clex-scene-rule short" /></div>
        <div className="clex-scene-sheet clex-scene-sheet-front"><span className="clex-scene-tag">Supplier review · sample</span><div className="clex-scene-heading">Before you sign, see what changed.</div><div className="clex-scene-rule mid" /><div className="clex-scene-highlight">Your plan: pay in 30 days.<br />Sample agreement: pay in 7 days.</div><div className="clex-scene-rule short" /></div>
        <Clexa className="clex-scene-character" decorative />
        <div className="clex-scene-badge"><span>Note for your lawyer</span>Confirm the payment terms before signing.</div>
      </div>
    </div>

    <div>
      <div className="clex-section-head"><div><p className="eyebrow">How it works</p><h2 className="clex-section-title">Start well. Stay ready.</h2></div><p className="clex-section-caption">Clexa guides the steps, while your confirmed company facts shape what appears next. Nothing is treated as legally verified just because it was entered.</p></div>
      <ol className="clex-journey">
        <li className="clex-journey-step is-mint"><span className="clex-journey-index">01</span><h3>Answer a few questions</h3><p>Where you are formed, what you do, who works with you. “Not sure” is a real answer.</p></li>
        <li className="clex-journey-step is-gold"><span className="clex-journey-index">02</span><h3>Tick off your checklist</h3><p>Steps built from your answers sit beside you. Tap the circle when one is done.</p></li>
        <li className="clex-journey-step is-coral"><span className="clex-journey-index">03</span><h3>Check a contract</h3><p>Paste an agreement, see where it differs from your deal, and take a packet to your lawyer.</p></li>
      </ol>
    </div>

    <div>
      <div className="clex-section-head"><div><p className="eyebrow">Your workspace</p><h2 className="clex-section-title">Your companies</h2></div><p className="clex-section-caption">{companies.length} {companies.length === 1 ? "company" : "companies"} in this browser</p></div>
      {companies.length === 0 ? <div className="clex-empty">You have no companies yet. <Link href="/companies/new" className="font-semibold underline">Try it out</Link> with your own company, or <Link href="/companies/new?demo=1" className="font-semibold underline">use the demo answers</Link>.</div> :
        <ul className="clex-company-list">{companies.map((c) => <li key={c.id}><Link href={`/companies/${c.id}/overview`} className="clex-company-card"><h3>{c.name}</h3><p className="mt-2">{lifecycleStageLabels[c.lifecycleStage]}</p><span className="clex-company-arrow">Open company workspace →</span></Link></li>)}</ul>}
    </div>
    <p className="clex-privacy">Each browser receives a private workspace automatically. Keep this browser’s cookies to retain access; account recovery is not part of this hackathon preview. Demo answers are synthetic facts, and all output is local preparation, not lawyer-approved legal guidance.</p>
  </section>;
}
