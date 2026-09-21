import Link from "next/link";

export default function NotFound() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="text-slate-600">That page or record does not exist or you do not have access to it.</p>
      <Link href="/" className="underline">Back to your companies</Link>
    </section>
  );
}
