import type { FactKey } from "@lex/domain";

/** Marker for a demo answer that is deliberately "Not sure", to show the unknown path. */
export const DEMO_UNKNOWN = "__unknown";

export const demoCompany = { name: "Clex Demo Bakery", lifecycleStage: "pre_registration" } as const;

/**
 * Synthetic sample answers for judges. They are only suggestions shown next to each
 * question; nothing is saved until the user picks answers and confirms.
 */
export const demoAnswers: Partial<Record<FactKey, string>> = {
  registration_status: "not_registered",
  legal_form: "private_company",
  formation_country: "NG",
  formation_subdivision: "Lagos",
  operating_locations: "Lagos, Nigeria",
  worker_locations: "Lagos, Nigeria",
  customer_markets: "Nigeria",
  industry: "Food and beverage",
  activities: "Bakes bread and pastries for local cafes",
  customer_type: "b2b",
  regulated_activity: DEMO_UNKNOWN,
  founder_count: "2",
  employee_count: "0",
  contractor_count: "1",
  hiring_plan: "yes",
  has_suppliers: "yes",
  customer_data: "contact",
  online_sales: "no",
  has_adviser: "no",
  current_priority: "Review a flour supply agreement before signing",
};

/** Synthetic agreement whose terms deliberately differ from the demo company's intended deal. */
export const sampleAgreement = {
  counterparty: "Demo Flour Co",
  intendedPayment: "Net 30 days after accepted delivery",
  text: `SYNTHETIC SAMPLE — NOT A REAL AGREEMENT

Flour supply agreement between Demo Flour Co and Clex Demo Bakery.

1. Deliverables. Demo Flour Co will deliver 200kg of flour every Monday.
2. Payment. Payment is due within 7 days of invoice.
3. Termination. Either party may terminate on 30 days' notice.
4. Limitation of liability. The supplier's total liability is capped at the fees paid in the previous month.
5. Governing law. This agreement is governed by the law of England and Wales.
`,
};
