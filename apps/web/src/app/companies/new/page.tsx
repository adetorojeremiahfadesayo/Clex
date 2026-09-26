import { redirect } from "next/navigation";
import { lifecycleStageLabels, lifecycleStages } from "@lex/domain";
import { currentUser } from "@/lib/session";
import { demoCompany } from "@/lib/demo-answers";
import { Clexa } from "@/components/clexa";
import { createCompanyAction } from "./actions";

export default async function NewCompanyPage({ searchParams }: { searchParams: Promise<{ error?: string; demo?: string }> }) {
  if (!(await currentUser())) redirect("/api/guest?next=/companies/new");
  const { error, demo } = await searchParams;
  const isDemo = demo === "1";
  const defaultStage = isDemo ? demoCompany.lifecycleStage : lifecycleStages[0];
  return (
    <section className="clex-start">
      <div className="clex-start-intro">
        <p className="eyebrow">{isDemo ? "Demo answers" : "Try it out"}</p>
        <h1 className="clex-page-title">{isDemo ? "Start the sample company" : "Add your company"}</h1>
        <p className="clex-page-sub">
          {isDemo
            ? "We’ve filled in a synthetic bakery. Create it, then pick the demo answer on each question — or change any answer yourself."
            : "Start with the basics. You will confirm more facts step by step; nothing here is treated as legally verified."}
        </p>
        <Clexa className="clex-start-art" decorative />
      </div>
      <form action={createCompanyAction} className="card clex-start-form">
        {isDemo && <input type="hidden" name="demo" value="1" />}
        <label className="block">
          <span className="clex-field-label">Business or trading name</span>
          <input name="name" required maxLength={200} defaultValue={isDemo ? demoCompany.name : undefined} className="field" />
        </label>
        <fieldset>
          <legend className="clex-field-label">Where is the business today?</legend>
          <div className="clex-stage-list">
            {lifecycleStages.map((stage) => (
              <label key={stage} className="clex-stage">
                <input type="radio" name="lifecycleStage" value={stage} defaultChecked={stage === defaultStage} required />
                <span>{lifecycleStageLabels[stage]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="clex-alert">
            Please provide a name and choose a stage.
          </p>
        )}
        <button type="submit" className="button-primary w-full">
          {isDemo ? "Create sample company →" : "Create company →"}
        </button>
      </form>
    </section>
  );
}
