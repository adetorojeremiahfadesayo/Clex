import Link from "next/link";

const steps = [
  { label: "Company questions", path: "overview" },
  { label: "Registration details", path: "overview" },
  { label: "Pack & certificate", path: "registration" },
  { label: "Compliance", path: "run" },
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
