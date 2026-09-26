import { notFound, redirect } from "next/navigation";
import { uuidSchema } from "@lex/domain";

/** The profile questions now live in the single company workspace. */
export default async function ProfilePage({ params, searchParams }: { params: Promise<{ companyId: string }>; searchParams: Promise<{ demo?: string }> }) {
  const { companyId } = await params;
  if (!uuidSchema.safeParse(companyId).success) notFound();
  const demo = (await searchParams).demo === "1";
  redirect(`/companies/${companyId}/overview?edit=1${demo ? "&demo=1" : ""}#profile`);
}
