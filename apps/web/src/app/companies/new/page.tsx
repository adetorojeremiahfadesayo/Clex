import { redirect } from "next/navigation";
import { createCompanyInputSchema, lifecycleStageLabels, lifecycleStages } from "@lex/domain";
import { createCompanyWithOwner } from "@lex/db";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";

async function createCompanyAction(formData: FormData) {
  "use server";
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/companies/new");
  const parsed = createCompanyInputSchema.safeParse({
    name: formData.get("name"),
    lifecycleStage: formData.get("lifecycleStage"),
  });
  if (!parsed.success) redirect("/companies/new?error=invalid");
  const company = await asActor(user.id, (db) => createCompanyWithOwner(db, parsed.data));
  redirect(`/companies/${company.id}/overview`);
}

export default async function NewCompanyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await currentUser())) redirect("/api/guest?next=/companies/new");
  const { error } = await searchParams;
  return (
    <section className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Add a company</h1>
      <p className="text-sm text-slate-600">
        Start with the basics. You will confirm more facts progressively; nothing here is treated as legally verified.
      </p>
      <form action={createCompanyAction} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Business or trading name</span>
          <input name="name" required maxLength={200} className="w-full rounded border border-slate-300 px-3 py-2" />
        </label>
        <fieldset className="space-y-2 text-sm">
          <legend className="mb-1 font-medium">Where is the business today?</legend>
          {lifecycleStages.map((stage, i) => (
            <label key={stage} className="flex items-start gap-2 rounded border border-slate-200 bg-white p-3">
              <input type="radio" name="lifecycleStage" value={stage} defaultChecked={i === 0} required className="mt-1" />
              <span>{lifecycleStageLabels[stage]}</span>
            </label>
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Please provide a name and choose a stage.
          </p>
        )}
        <button type="submit" className="rounded bg-[var(--accent)] px-4 py-2 font-medium text-white">
          Create company
        </button>
      </form>
    </section>
  );
}
