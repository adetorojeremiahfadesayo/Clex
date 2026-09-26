"use client";

import { useState } from "react";

export function StartDemoButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function start() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/demo", { method: "POST", headers: { "content-type": "application/json" } });
      if (!response.ok) throw new Error("Could not prepare the demo. Please try again.");
      const data = await response.json() as { url: string };
      window.location.assign(data.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not prepare the demo.");
      setPending(false);
    }
  }
  return <div>
    <button type="button" disabled={pending} onClick={start} className="rounded-lg border border-white/50 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60">
      {pending ? "Preparing demo…" : "Try the ready-made demo →"}
    </button>
    {error && <p role="alert" className="mt-2 text-sm text-red-100">{error}</p>}
  </div>;
}
