import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { uuidSchema } from "@lex/domain";
import { getCompany, listJobs } from "@lex/db";
import { JobsPanel } from "@/components/jobs-panel";
import { asActor } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function JobsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { companyId } = await params;
  if (!uuidSchema.safeParse(companyId).success) notFound();
  const data = await asActor(user.id, async (db) => {
    const company = await getCompany(db, companyId);
    return company ? { company, jobs: await listJobs(db, companyId) } : null;
  });
  if (!data) notFound();

  return (
    <section className="space-y-6">
      <nav className="text-sm text-slate-600" aria-label="Breadcrumb">
        <Link href="/" className="underline">Companies</Link> /{" "}
        <Link href={`/companies/${companyId}/overview`} className="underline">{data.company.name}</Link> / Jobs
      </nav>
      <h1 className="text-2xl font-semibold">Background jobs</h1>
      <JobsPanel companyId={companyId} initialJobs={data.jobs} />
    </section>
  );
}
