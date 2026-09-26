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
