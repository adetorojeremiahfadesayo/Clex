"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegenerateButton({ companyId, stale, disabled }: { companyId: string; stale: boolean; disabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const res = await fetch(`/api/v1/companies/${companyId}/assessments`, { method: "POST" });
          setPending(false);
          if (!res.ok) {
            const d = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
            setError(d?.error?.message ?? "Could not regenerate");
            return;
          }
          router.refresh();
        }}
        className={`rounded px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${stale ? "bg-[var(--accent)]" : "bg-slate-600"}`}
      >
        {pending ? "Regenerating…" : stale ? "Regenerate assessment" : "Re-run assessment"}
      </button>
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
