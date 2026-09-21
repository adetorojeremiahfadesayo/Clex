"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setPending(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(data?.error?.message ?? "Something went wrong");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-4" noValidate>
      {mode === "sign-up" && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Your name</span>
          <input name="displayName" required autoComplete="name" className="w-full rounded border border-slate-300 px-3 py-2" />
        </label>
      )}
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Email</span>
        <input name="email" type="email" required autoComplete="email" className="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Password{mode === "sign-up" && " (at least 10 characters)"}</span>
        <input
          name="password"
          type="password"
          required
          minLength={mode === "sign-up" ? 10 : 1}
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
      </label>
      {error && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-[var(--accent)] px-3 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
