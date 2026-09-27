import Link from "next/link";
import { redirect } from "next/navigation";
import { lifecycleStageLabels } from "@lex/domain";
import { listCompanies } from "@lex/db";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { Clexa } from "@/components/clexa";
import { demoCompany } from "@/lib/demo-answers";
import { companyModules } from "@/lib/modules";
import { createCompanyAction } from "@/app/companies/new/actions";

export const dynamic = "force-dynamic";

const journey = [
  { n: "01", title: "Answer a few questions", body: "One short screen at a time. “Not sure” is a real answer.", tone: "is-mint" },
  { n: "02", title: "Prepare registration details", body: "Save names, founders, address and legal form. Progress updates from those actions.", tone: "is-gold" },
  { n: "03", title: "Pack and certificate", body: "Download a PDF for your lawyer, then upload proof when you are registered.", tone: "is-coral" },
  { n: "04", title: "Manage ongoing work", body: "Track contracts, hiring, data and filings with a workspace for each area.", tone: "is-violet" },
];

export default async function HomePage() {
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/");
  const companies = await asActor(user.id, (db) => listCompanies(db));

  return <section className="clex-home">
    <div className="clex-hero">
      <p className="clex-hero-kicker"><span>New</span> From registration to running the company</p>
      <h1 className="clex-hero-title">Your company,<br /><mark>clearly prepared.</mark></h1>
      <p className="clex-hero-sub">Clex turns what you know about your business into registration steps, a pack for your lawyer, and workspaces for contracts, hiring and filings.</p>
      <div className="clex-hero-actions">
        <Link href="/companies/new" className="button-primary is-lg">Try it out →</Link>
        <form action={createCompanyAction}>
          <input type="hidden" name="demo" value="1" />
          <input type="hidden" name="name" value={demoCompany.name} />
          <input type="hidden" name="lifecycleStage" value={demoCompany.lifecycleStage} />
          <button type="submit" className="button-secondary is-lg">Click demo answers</button>
        </form>
      </div>
      <p className="clex-hero-hint">For judges: try a sample Lagos bakery. Fill and read one question page at a time.</p>
    </div>

    <div className="clex-showcase" aria-hidden="true">
      <div className="clex-window">
        <div className="clex-window-bar"><span /><span /><span /><em>Clex Demo Bakery</em></div>
        <div className="clex-window-body">
          <div className="clex-window-main">
            <p className="clex-window-label">Agent · Contracts &amp; suppliers</p>
            <div className="clex-window-msg is-user">Does this contract match what we agreed on Slack?</div>
            <div className="clex-window-msg">Payment doesn&apos;t match. Slack says <b>30 days</b>, the contract says <b>7 days</b>. I&apos;ve drafted a letter asking for the change.</div>
            <div className="clex-window-draft"><span>Draft v1</span>Dear Demo Flour Co, before we sign, please update clause 2…</div>
          </div>
          <div className="clex-window-side">
            <p className="clex-window-label">Registration · 4/7</p>
            {["Answer company questions", "Choose company names", "Download registration pack", "Upload certificate"].map((t, i) => <div key={t} className={`clex-window-item ${i < 2 ? "is-done" : ""}`}><span />{t}</div>)}
          </div>
        </div>
      </div>
      <Clexa className="clex-showcase-mascot" decorative />
    </div>

    <section>
      <div className="clex-section-head"><div><p className="eyebrow">How it works</p><h2 className="clex-section-title">Start well. Stay ready.</h2></div><p className="clex-section-caption">Your confirmed facts drive every step. Nothing is treated as legally verified just because it was entered, and every output is preparation for a qualified adviser.</p></div>
      <ol className="clex-journey">{journey.map((j) => <li key={j.n} className={`clex-journey-step ${j.tone}`}><span className="clex-journey-index">{j.n}</span><h3>{j.title}</h3><p>{j.body}</p></li>)}</ol>
    </section>

    <section>
      <div className="clex-section-head"><div><p className="eyebrow">After registration</p><h2 className="clex-section-title">Everything a running company keeps in order</h2></div></div>
      <ul className="clex-module-strip">{companyModules.map((m) => <li key={m.id} className={`is-${m.accent}`}><strong>{m.title}</strong><span>{m.blurb}</span></li>)}</ul>
    </section>

    <section>
      <div className="clex-section-head"><div><p className="eyebrow">Your workspace</p><h2 className="clex-section-title">Your companies</h2></div><p className="clex-section-caption">{companies.length} {companies.length === 1 ? "company" : "companies"} in this browser</p></div>
      {companies.length === 0 ? <div className="clex-empty">No companies yet. <Link href="/companies/new" className="clex-link">Try it out</Link> with your own, or use the demo answers above.</div> :
        <ul className="clex-company-list">{companies.map((c) => <li key={c.id}><Link href={`/companies/${c.id}/overview`} className="clex-company-card"><h3>{c.name}</h3><p>{lifecycleStageLabels[c.lifecycleStage]}</p><span className="clex-company-arrow">Open workspace →</span></Link></li>)}</ul>}
    </section>
    <p className="clex-fineprint">Each browser gets a private workspace automatically; keep this browser&apos;s cookies to keep access. Demo answers and samples are synthetic. Output is local preparation, not lawyer-approved legal guidance.</p>
  </section>;
}
