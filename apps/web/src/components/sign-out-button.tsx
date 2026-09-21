"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
      onClick={() =>
        start(async () => {
          await fetch("/api/auth/sign-out", { method: "POST" });
          router.push("/sign-in");
          router.refresh();
        })
      }
    >
      Sign out
    </button>
  );
}
