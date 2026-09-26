import Link from "next/link";
import { Clexa } from "./clexa";

export function ClexaGuide({ eyebrow = "Clexa's next step", title, description, href, action }: {
  eyebrow?: string;
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return <aside className="clexa-guide" aria-label="Clexa guide">
    <Clexa className="clexa-guide-art" />
    <div className="clexa-guide-body"><span className="eyebrow">{eyebrow}</span><h2 className="mt-1">{title}</h2><p className="mt-2">{description}</p></div>
    {href && action && <div className="clexa-guide-action"><Link href={href} className="button-primary">{action} →</Link></div>}
  </aside>;
}
