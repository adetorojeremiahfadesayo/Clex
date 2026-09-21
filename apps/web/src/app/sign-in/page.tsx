import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { currentUser } from "@/lib/session";

export default async function SignInPage() {
  if (await currentUser()) redirect("/");
  return (
    <section className="space-y-6">
      <h1 className="text-center text-2xl font-semibold">Sign in</h1>
      <AuthForm mode="sign-in" />
      <p className="text-center text-sm text-slate-600">
        New here? <Link href="/sign-up" className="underline">Create an account</Link>
      </p>
    </section>
  );
}
