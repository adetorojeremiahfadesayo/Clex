import Link from "next/link";

const steps = [
  { label: "Answer questions", path: "overview" },
  { label: "Tick checklist", path: "overview" },
  { label: "Registration pack", path: "registration" },
  { label: "Run your company", path: "run" },
];

export function JourneySteps({ companyId, step, q = "" }: { companyId: string; step: number; q?: string }) {
  return (
    <ol className="clex-stepper" aria-label="Progress">
      {steps.map((s, i) => {
        const n = i + 1;
        const cls = n < step ? "is-done" : n === step ? "is-current" : "";
        return <li key={s.label} className={cls}><Link href={`/companies/${companyId}/${s.path}${q}`} aria-current={n === step ? "step" : undefined}><span>{n < step ? "✓" : n}</span>{s.label}</Link></li>;
      })}
    </ol>
  );
}
