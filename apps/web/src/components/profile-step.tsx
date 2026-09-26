"use client";

import { useState, type ReactNode } from "react";

/** Collapses confirmed answers to a summary so the next step stays in view. */
export function ProfileStep({ summary, startOpen, children }: { summary: { label: string; value: string }[]; startOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(startOpen);
  if (open) return <>{children}</>;
  return (
    <div>
      <ul className="clex-fact-chips">
        {summary.map((f) => <li key={f.label}><span>{f.label}</span>{f.value}</li>)}
      </ul>
      <button type="button" className="clex-link mt-4" onClick={() => setOpen(true)}>Edit answers</button>
    </div>
  );
}
