import { redirect } from "next/navigation";
import { createCompanyInputSchema, lifecycleStageLabels, lifecycleStages } from "@lex/domain";
import { createCompanyWithOwner } from "@lex/db";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { demoCompany } from "@/lib/demo-answers";
import { Clexa } from "@/components/clexa";

async function createCompanyAction(formData: FormData) {
  "use server";
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/companies/new");
  const demo = formData.get("demo") === "1";
  const parsed = createCompanyInputSchema.safeParse({
    name: formData.get("name"),
    lifecycleStage: formData.get("lifecycleStage"),
  });
  if (!parsed.success) redirect(`/companies/new?error=invalid${demo ? "&demo=1" : ""}`);
  const company = await asActor(user.id, (db) => createCompanyWithOwner(db, parsed.data));
  redirect(demo ? `/companies/${company.id}/profile?demo=1` : `/companies/${company.id}/overview`);
}

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
