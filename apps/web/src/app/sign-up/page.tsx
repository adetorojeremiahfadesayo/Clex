import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { currentUser } from "@/lib/session";

export default async function SignUpPage() {
  if (await currentUser()) redirect("/");
  return (
    <section className="space-y-6">
      <h1 className="text-center text-2xl font-semibold">Create your account</h1>
      <AuthForm mode="sign-up" />
      <p className="text-center text-sm text-slate-600">
        Already registered? <Link href="/sign-in" className="underline">Sign in</Link>
      </p>
    </section>
  );
}
