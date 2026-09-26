"use server";

import { redirect } from "next/navigation";
import { createCompanyInputSchema } from "@lex/domain";
import { createCompanyWithOwner } from "@lex/db";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function createCompanyAction(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/api/guest?next=/companies/new");
  const demo = formData.get("demo") === "1";
  const parsed = createCompanyInputSchema.safeParse({
    name: formData.get("name"),
    lifecycleStage: formData.get("lifecycleStage"),
  });
  if (!parsed.success) redirect(`/companies/new?error=invalid${demo ? "&demo=1" : ""}`);
  const company = await asActor(user.id, (db) => createCompanyWithOwner(db, parsed.data));
  redirect(`/companies/${company.id}/overview${demo ? "?demo=1" : ""}`);
}
